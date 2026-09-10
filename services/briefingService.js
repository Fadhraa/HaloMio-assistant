import fs from "fs";
import path from "path";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { HARI_INDO, BULAN_INDO } from "../functions/helper/parse_tanggal.js";
import { bangunPromptBriefing } from "../prompts/briefingPrompt.js";

let briefingCache = {
  text: null,
  timestamp: 0,
};
const TTL_CACHE_MS = 15 * 60 * 1000;
function getOllamaModel() {
  return new ChatOllama({
    model: "gemma3:4b",
    temperature: 0.2,
  });
}
export async function getBriefingDashboard(
  namaUser = "Fadhra",
  forceRefresh = false,
) {
  const sekarang = new Date();
  const jam = sekarang.getHours();
  const periode =
    jam >= 18 || jam < 4
      ? "malam hari"
      : jam >= 15
        ? "sore hari"
        : jam >= 11
          ? "siang hari"
          : "pagi hari";
  const waktuSekarangStr = `${sekarang.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} (${periode})`;

  const umurCache = Date.now() - briefingCache.timestamp;
  if (!forceRefresh && briefingCache.text && umurCache < TTL_CACHE_MS) {
    return { briefing: briefingCache.text, fromCache: true };
  }
  const jadwalPath = path.join(process.cwd(), "memory", "jadwal.json");
  if (!fs.existsSync(jadwalPath)) {
    return {
      briefing:
        "Belum ada jadwal yang tercatat untuk hari ini. Selamat beraktivitas!",
      fromCache: false,
    };
  }
  const rawData = fs.readFileSync(jadwalPath, "utf-8");
  const semuaJadwal = JSON.parse(rawData);
  const namaHariIni = HARI_INDO[sekarang.getDay()];
  const tglHariIni = sekarang.getDate().toString().padStart(2, "0");
  const bulanList = Object.keys(BULAN_INDO);
  const stringTanggalHariIni = `${tglHariIni} ${bulanList[sekarang.getMonth()]} ${sekarang.getFullYear()}`;

  const jadwalHariIni = semuaJadwal.filter((item) => {
    if (item.frekuensi === "harian") return true;
    if (item.frekuensi === "mingguan" && item.hari === namaHariIni) return true;
    if (
      item.frekuensi === "sekali_saja" &&
      item.tanggal === stringTanggalHariIni
    )
      return true;
    return false;
  });
  const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();
  const batasMenitMaksimal = menitSekarang + 180;
  const kegiatanRelevan = [];

  for (const item of jadwalHariIni) {
    const jamStr = item.jam_mulai || item.jam || "00:00";
    const [j, m] = jamStr.split(":").map(Number);
    const menitMulai = j * 60 + m;
    const durasi = item.durasi || 60;
    const menitSelesai = menitMulai + durasi;
    const isSedangBerjalan =
      menitSekarang >= menitMulai && menitSekarang < menitSelesai;
    const isAkanDatang =
      menitMulai >= menitSekarang && menitMulai <= batasMenitMaksimal;
    if (isSedangBerjalan) {
      kegiatanRelevan.push({
        status: "sedang_berlangsung",
        judul: item.judul || item.kegiatan,
        jam: jamStr,
        ruangan: item.ruangan,
        dosen: item.dosen,
      });
    } else if (isAkanDatang) {
      kegiatanRelevan.push({
        status: "segera_datang",
        judul: item.judul || item.kegiatan,
        jam: jamStr,
        ruangan: item.ruangan,
        dosen: item.dosen,
      });
    }
  }
  let statusJadwal = "";
  let daftarKegiatanText = "";
  if (kegiatanRelevan.length === 0) {
    statusJadwal =
      "Tidak ada agenda yang sedang berlangsung maupun yang akan dimulai dalam 3 jam ke depan. ";
    daftarKegiatanText = "(Kosong)";
  } else {
    statusJadwal = `Terdapat ${kegiatanRelevan.length} agenda penting yang sedang atau segera berlangsung.`;
    daftarKegiatanText = kegiatanRelevan
      .map(
        (k) =>
          `- [${k.status === "sedang_berlangsung" ? "SEDANG BERLANGSUNG" : `Pukul ${k.jam}`}] ${k.judul}${
            k.ruangan ? ` di ${k.ruangan}` : ""
          }${k.dosen ? ` bersama ${k.dosen}` : ""}`,
      )
      .join("\n");
  }
  const prompt = bangunPromptBriefing({
    namaUser,
    waktuSekarang: waktuSekarangStr,
    statusJadwal,
    daftarKegiatan: daftarKegiatanText,
  });
  try {
    const model = getOllamaModel();
    const response = await model.invoke([new HumanMessage(prompt)]);
    const teksHasil = response.content.trim();
    // Simpan ke Cache
    briefingCache = {
      text: teksHasil,
      timestamp: Date.now(),
    };
    return { briefing: teksHasil, fromCache: false };
  } catch (e) {
    console.error("[ERROR BRIEFING OLLAMA]:", e.message || e);

    // Fallback cerdas tanpa LLM jika Ollama sedang tidak aktif / error
    if (kegiatanRelevan.length > 0) {
      return {
        briefing: `Agenda terdekat Anda adalah ${kegiatanRelevan[0].judul} pukul ${kegiatanRelevan[0].jam}. Selamat beraktivitas!`,
        fromCache: false,
      };
    }
    return {
      briefing:
        "Tidak ada agenda mendesak dalam 3 jam ke depan. Waktu yang baik untuk fokus pada proyek pribadi!",
      fromCache: false,
    };
  }
}
