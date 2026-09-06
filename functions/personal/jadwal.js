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
  async ({ activity, type, date, day, time, duration }) => {
    // membuat file jadwal.json
    const PATH_JADWAL = path.join(process.cwd(), "memory", "jadwal.json");
    const dirPath = path.dirname(PATH_JADWAL);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    // baca isi file jika ada
    let semuaJadwal = [];
    if (fs.existsSync(PATH_JADWAL)) {
      const isiFile = fs.readFileSync(PATH_JADWAL, "utf-8");
      semuaJadwal = JSON.parse(isiFile);
    }

    // masukkan jadwal baru
    const jadwalBaru = {
      id: crypto.randomUUID(),
      kegiatan: activity,
      tipe: type,
      tanggal: type === "sekali_saja" ? date : null,
      hari: type === "berulang" ? day : null,
      jam: time,
      durasi: duration || 120, // Default 2 jam
      status: "pending",
      dicatat_pada: new Date().toISOString(),
    };

    semuaJadwal.push(jadwalBaru);

    // tulis kembali ke file
    fs.writeFileSync(
      PATH_JADWAL,
      JSON.stringify(semuaJadwal, null, 2),
      "utf-8",
    );

    const detailWaktu = type === "sekali_saja" ? `pada tanggal ${date}` : `setiap hari ${day}`;
    return `Jadwal "${activity}" (${type}) ${detailWaktu} pukul ${time} sudah Mio catat di database.`;
  },
  {
    name: "tambah_jadwal",
    description:
      "Gunakan alat ini untuk mencatat jadwal Fadhra (baik jadwal sekali saja maupun jadwal rutin/berulang mingguan).",
    schema: z.object({
      activity: z.string().describe("Nama kegiatan atau aktivitas"),
      type: z
        .enum(["sekali_saja", "berulang"])
        .describe(
          "Tipe jadwal, apakah sekali saja atau rutin berulang setiap minggu",
        ),
      date: z
        .string()
        .optional()
        .describe(
          "Tanggal kegiatan dilaksanakan jika tipe 'sekali_saja' (format: DD Bulan YYYY, contoh: 07 Maret 2026)",
        ),
      day: z
        .string()
        .optional()
        .describe(
          "Nama hari jika tipe 'berulang' (contoh: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        ),
      time: z
        .string()
        .describe(
          "Jam kegiatan dalam format HH:MM 24-jam (contoh: 08:00 atau 14:30)",
        ),
      duration: z
        .number()
        .optional()
        .describe(
          "Estimasi durasi kegiatan dalam menit, default 120 menit jika kosong",
        ),
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
