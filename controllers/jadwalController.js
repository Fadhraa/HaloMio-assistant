import fs from "fs";
import path from "path";
import { BULAN_INDO, HARI_INDO } from "../functions/helper/parse_tanggal.js";

// Helper untuk format tanggal Date objek menjadi "DD Bulan YYYY"
function formatTanggalIndo(date) {
  const tgl = date.getDate().toString().padStart(2, "0");
  const bulanList = Object.keys(BULAN_INDO);
  const bulan = bulanList[date.getMonth()];
  const tahun = date.getFullYear();
  return `${tgl} ${bulan} ${tahun}`;
}

export function ambilJadwal(req, res) {
  const jadwalPATH = path.join(process.cwd(), "memory", "jadwal.json");
  if (!fs.existsSync(jadwalPATH)) {
    return res.json([]);
  }

  fs.readFile(jadwalPATH, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Gagal membaca file jadwal." });
    }

    try {
      const semuaJadwal = JSON.parse(data);
      const sekarang = new Date();
      const filter = req.query.filter;

      if (filter === "mingguan") {
        // --- LOGIKA JADWAL MINGGUAN (7 HARI KE DEPAN) ---
        const hasilMingguan = [];
        let databaseBerubah = false;

        for (let i = 0; i < 7; i++) {
          const targetDate = new Date();
          targetDate.setDate(sekarang.getDate() + i);

          const tglStr = formatTanggalIndo(targetDate);
          const hariName = HARI_INDO[targetDate.getDay()];
          const isHariIni = i === 0;

          // Saring jadwal yang jatuh pada tanggal/hari ini
          const jadwalHariIni = semuaJadwal.filter((item) => {
            if (item.frekuensi === "harian") return true;
            if (item.frekuensi === "mingguan" && item.hari === hariName) return true;
            if (item.frekuensi === "sekali_saja" && item.tanggal === tglStr) return true;
            return false;
          });

          // Urutkan kronologis berdasarkan jam mulai
          jadwalHariIni.sort((a, b) => {
            const [jamA, minA] = (a.jam_mulai || a.jam || "00:00").split(":").map(Number);
            const [jamB, minB] = (b.jam_mulai || b.jam || "00:00").split(":").map(Number);
            return jamA * 60 + minA - (jamB * 60 + minB);
          });

          // Hitung status dinamis
          const itemsDenganStatus = jadwalHariIni.map((item, index) => {
            if (!isHariIni) {
              return { ...item, status: "pending" };
            }

            const jamSekarang = sekarang.getHours();
            const menitSekarang = sekarang.getMinutes();
            const menitTotalSekarang = jamSekarang * 60 + menitSekarang;

            const [jamMulai, menitMulai] = (item.jam_mulai || item.jam || "00:00").split(":").map(Number);
            const menitStart = jamMulai * 60 + menitMulai;
            const durasiDefault = item.durasi || 120;
            let menitEnd = menitStart + durasiDefault;

            // Sesuaikan batas durasi jika berhimpitan dengan jadwal berikutnya
            if (index < jadwalHariIni.length - 1) {
              const [nextJam, nextMenit] = (jadwalHariIni[index + 1].jam_mulai || jadwalHariIni[index + 1].jam || "00:00")
                .split(":")
                .map(Number);
              const nextStart = nextJam * 60 + nextMenit;
              if (nextStart < menitEnd) {
                menitEnd = nextStart;
              }
            }

            let statusDinamis = "pending";
            if (menitTotalSekarang >= menitStart && menitTotalSekarang < menitEnd) {
              statusDinamis = "active";
            } else if (menitTotalSekarang >= menitEnd) {
              statusDinamis = "completed";
            }

            // Auto-Arsip jika jadwal sekali_saja untuk hari ini sudah terlewati
            if (
              item.frekuensi === "sekali_saja" &&
              statusDinamis === "completed" &&
              item.status !== "completed"
            ) {
              const itemAsli = semuaJadwal.find((j) => j.id === item.id);
              if (itemAsli) {
                itemAsli.status = "completed";
                databaseBerubah = true;
              }
            }

            return { ...item, status: statusDinamis };
          });

          hasilMingguan.push({
            tanggal: tglStr,
            hari: hariName,
            is_hari_ini: isHariIni,
            items: itemsDenganStatus,
          });
        }

        if (databaseBerubah) {
          fs.writeFile(jadwalPATH, JSON.stringify(semuaJadwal, null, 2), "utf-8", (err) => {
            if (err) console.error("Gagal mengarsip jadwal otomatis:", err);
          });
        }

        return res.json(hasilMingguan);
      } else {
        // --- LOGIKA JADWAL HARI INI SAJA (FLAT ARRAY) ---
        const jamSekarang = sekarang.getHours();
        const menitSekarang = sekarang.getMinutes();
        const menitTotalSekarang = jamSekarang * 60 + menitSekarang;

        const stringTanggalHariIni = formatTanggalIndo(sekarang);
        const namaHariIni = HARI_INDO[sekarang.getDay()];

        const jadwalHariIni = semuaJadwal.filter((item) => {
          if (item.frekuensi === "harian") return true;
          if (item.frekuensi === "mingguan" && item.hari === namaHariIni) return true;
          if (item.frekuensi === "sekali_saja" && item.tanggal === stringTanggalHariIni) return true;
          return false;
        });

        jadwalHariIni.sort((a, b) => {
          const [jamA, minA] = (a.jam_mulai || a.jam || "00:00").split(":").map(Number);
          const [jamB, minB] = (b.jam_mulai || b.jam || "00:00").split(":").map(Number);
          return jamA * 60 + minA - (jamB * 60 + minB);
        });

        let databaseBerubah = false;
        const jadwalHasil = jadwalHariIni.map((item, index) => {
          const [jamMulai, menitMulai] = (item.jam_mulai || item.jam || "00:00").split(":").map(Number);
          const menitStart = jamMulai * 60 + menitMulai;
          const durasiDefault = item.durasi || 120;
          let menitEnd = menitStart + durasiDefault;

          if (index < jadwalHariIni.length - 1) {
            const [nextJam, nextMenit] = (jadwalHariIni[index + 1].jam_mulai || jadwalHariIni[index + 1].jam || "00:00")
              .split(":")
              .map(Number);
            const nextStart = nextJam * 60 + nextMenit;
            if (nextStart < menitEnd) {
              menitEnd = nextStart;
            }
          }

          let statusDinamis = "pending";
          if (menitTotalSekarang >= menitStart && menitTotalSekarang < menitEnd) {
            statusDinamis = "active";
          } else if (menitTotalSekarang >= menitEnd) {
            statusDinamis = "completed";
          }

          if (
            item.frekuensi === "sekali_saja" &&
            statusDinamis === "completed" &&
            item.status !== "completed"
          ) {
            const itemAsli = semuaJadwal.find((j) => j.id === item.id);
            if (itemAsli) {
              itemAsli.status = "completed";
              databaseBerubah = true;
            }
          }

          return { ...item, status: statusDinamis };
        });

        if (databaseBerubah) {
          fs.writeFile(jadwalPATH, JSON.stringify(semuaJadwal, null, 2), "utf-8", (err) => {
            if (err) console.error("Gagal mengarsip jadwal otomatis:", err);
          });
        }

        return res.json(jadwalHasil);
      }
    } catch (e) {
      console.error("[ERROR PARSE JADWAL]:", e);
      res.status(500).json({ error: "Format data jadwal tidak valid" });
    }
  });
}
