import { tool } from "@langchain/core/tools";
import z from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const toolLihatJadwal = tool(
  async ({}) => {
    const PATH_JADWAL = path.join(process.cwd(), "memory", "jadwal.json");
    if (!fs.existsSync(PATH_JADWAL)) {
      return "Tidak ada jadwal yang tersimpan di database.";
    }

    const semuaJadwal = JSON.parse(fs.readFileSync(PATH_JADWAL, "utf-8"));
    if (semuaJadwal.length === 0) {
      return "Tidak ada jadwal yang tersimpan di database.";
    }

    return `Berikut adalah semua jadwal Fadhra yang tersimpan di database:\n${JSON.stringify(semuaJadwal, null, 2)}`;
  },
  {
    name: "lihat_jadwal",
    description:
      "Gunakan alat ini untuk membantu Fadhra melihat jadwal yang sudah tercatat di database.",
    schema: z.object({}),
  },
);

export const toolTambahJadwal = tool(
  async ({
    title,
    category,
    frequency,
    day,
    date,
    startTime,
    endTime,
    lecturer,
    room,
    session,
  }) => {
    // membuat file jadwal.json
    const PATH_JADWAL = path.join(process.cwd(), "memory", "jadwal.json");
    const dirPath = path.dirname(PATH_JADWAL);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let durasiMenit = 60;
    try {
      const [h1, m1] = startTime.split(":").map(Number);
      const [h2, m2] = endTime.split(":").map(Number);
      durasiMenit = h2 * 60 + m2 - (h1 * 60 + m1);
    } catch (e) {}

    // baca isi file jika ada
    let semuaJadwal = [];
    if (fs.existsSync(PATH_JADWAL)) {
      const isiFile = fs.readFileSync(PATH_JADWAL, "utf-8");
      semuaJadwal = JSON.parse(isiFile);
    }

    const jadwalBaru = {
      id: `jdw_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      kategori: category || "rutinitas",
      judul: title,
      dosen: lecturer || null,
      ruangan: room || null,
      frekuensi: frequency || "mingguan",
      hari: frequency !== "sekali_saja" ? day : null,
      tanggal: frequency === "sekali_saja" ? date : null,
      jam_mulai: startTime,
      jam_selesai: endTime,
      durasi: durasiMenit,
      sesi_ke: session || null,
      status: "aktif",
      dicatat_pada: new Date().toISOString(),
    };

    semuaJadwal.push(jadwalBaru);

    // tulis kembali ke file
    fs.writeFileSync(
      PATH_JADWAL,
      JSON.stringify(semuaJadwal, null, 2),
      "utf-8",
    );

    return `Jadwal "${title}" (${category}) berhasil dicatat untuk hari ${day || date} pukul ${startTime} - ${endTime}.`;
  },
  {
    name: "tambah_jadwal",
    description:
      "Mencatat jadwal kuliah, rutinitas, atau agenda acara Fadhra ke database.",
    schema: z.object({
      title: z.string().describe("Nama mata kuliah atau kegiatan"),
      category: z
        .enum(["kuliah", "rutinitas", "kegiatan"])
        .describe("Kategori kegiatan"),
      frequency: z
        .enum(["mingguan", "harian", "sekali_saja"])
        .describe("Frekuensi pengulangan"),
      day: z.string().optional().describe("Nama hari (contoh: Senin, Selasa)"),
      date: z
        .string()
        .optional()
        .describe("Tanggal spesifik jika sekali_saja (contoh: 2026-09-08)"),
      startTime: z.string().describe("Jam mulai format HH:MM (contoh: 08:00)"),
      endTime: z.string().describe("Jam selesai format HH:MM (contoh: 09:40)"),
      lecturer: z
        .string()
        .optional()
        .describe("Nama dosen pengajar (khusus kuliah)"),
      room: z
        .string()
        .optional()
        .describe("Ruangan/Gedung kelas (khusus kuliah, contoh: SAW-03.08)"),
      session: z
        .number()
        .optional()
        .describe("Urutan sesi jam ke- (khusus kuliah)"),
    }),
  },
);
export const toolHapusJadwal = tool(
  async ({ id, activity }) => {
    const PATH_JADWAL = path.join(process.cwd(), "memory", "jadwal.json");
    if (!fs.existsSync(PATH_JADWAL)) {
      return "Tidak ada jadwal yang tersimpan di database.";
    }

    let semuaJadwal = JSON.parse(fs.readFileSync(PATH_JADWAL, "utf-8"));
    if (semuaJadwal.length === 0) {
      return "Tidak ada jadwal yang tersimpan di database.";
    }

    const index = semuaJadwal.findIndex((j) => j.id === id);
    if (index === -1) {
      return `Tidak ditemukan jadwal dengan id "${id}".`;
    }

    const namaJadwal = semuaJadwal[index].kegiatan;
    semuaJadwal.splice(index, 1);

    fs.writeFileSync(
      PATH_JADWAL,
      JSON.stringify(semuaJadwal, null, 2),
      "utf-8",
    );

    return `Jadwal "${namaJadwal}" berhasil dihapus dari database.`;
  },
  {
    name: "hapus_jadwal",
    description:
      "Gunakan alat ini untuk membantu Fadhra menghapus jadwal yang sudah tidak diperlukan lagi.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "ID unik dari jadwal yang ingin dihapus. Bisa didapatkan dari tool 'lihat_jadwal'.",
        ),
      activity: z
        .string()
        .optional()
        .describe(
          "Nama kegiatan. Hanya untuk konteks, tidak digunakan dalam logika penghapusan.",
        ),
    }),
  },
);
