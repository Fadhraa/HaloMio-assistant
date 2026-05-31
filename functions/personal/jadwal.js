import { tool } from "@langchain/core/tools";
import z from "zod";
import fs from "fs";
import path from "path";

export const toolLihatJadwal = tool(async ({ }) => {
    const PATH_JADWAL = path.join(process.cwd(), 'memory', 'jadwal.json')
    if (!fs.existsSync(PATH_JADWAL)) {
        return "Tidak ada jadwal yang tersimpan di database."
    }

    const semuaJadwal = JSON.parse(fs.readFileSync(PATH_JADWAL, 'utf-8'));
    if (semuaJadwal.length === 0) {
        return "Tidak ada jadwal yang tersimpan di database."
    }

    return `Berikut adalah semua jadwal Fadhra yang tersimpan di database:\n${JSON.stringify(semuaJadwal, null, 2)}`;
}, {
    name: "lihat_jadwal",
    description: "Gunakan alat ini untuk membantu Fadhra melihat jadwal yang sudah tercatat di database.",
    schema: z.object({
    })
})

export const toolTambahJadwal = tool(async ({ activity, date, time, }) => {
    // membuat file jadwal.json
    const PATH_JADWAL = path.join(process.cwd(), 'memory', 'jadwal.json')
    const dirPath = path.dirname(PATH_JADWAL);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
    // baca isi file jika ada
    let semuaJadwal = [];
    if (fs.existsSync(PATH_JADWAL)) {
        const isiFile = fs.readFileSync(PATH_JADWAL, 'utf-8');
        semuaJadwal = JSON.parse(isiFile);
    }

    // masukkan jadwal baru
    const jadwalBaru = {
        id: crypto.randomUUID(),
        kegiatan: activity,
        tanggal: date,
        jam: time,
        dicatat_pada: new Date().toISOString(),
    }
    semuaJadwal.push(jadwalBaru);




    // tulis kembali ke file
    fs.writeFileSync(PATH_JADWAL, JSON.stringify(semuaJadwal, null, 2), 'utf-8');

    return `Jadwal ${activity} pada ${date} jam ${time} sudah Mio catat di database.`
}, {
    name: "tambah_jadwal",
    description: "Gunakan alat ini untuk membantu Fadhra mencatat jadwal jadwalnya.",
    schema: z.object({
        activity: z.string().describe("Nama kegiatan atau aktivitas yang akan dijadwalkan"),
        date: z.string().describe("Tanggal kegiatan akan dilaksanakan"),
        time: z.string().describe("Jam kegiatan akan dilaksanakan"),
    })
})
export const toolHapusJadwal = tool(async ({ id, activity }) => {
    const PATH_JADWAL = path.join(process.cwd(), 'memory', 'jadwal.json')
    if (!fs.existsSync(PATH_JADWAL)) {
        return "Tidak ada jadwal yang tersimpan di database."
    }

    let semuaJadwal = JSON.parse(fs.readFileSync(PATH_JADWAL, 'utf-8'));
    if (semuaJadwal.length === 0) {
        return "Tidak ada jadwal yang tersimpan di database."
    }

    const index = semuaJadwal.findIndex(j => j.id === id);
    if (index === -1) {
        return `Tidak ditemukan jadwal dengan id "${id}".`
    }

    const namaJadwal = semuaJadwal[index].kegiatan;
    semuaJadwal.splice(index, 1);

    fs.writeFileSync(PATH_JADWAL, JSON.stringify(semuaJadwal, null, 2), 'utf-8');

    return `Jadwal "${namaJadwal}" berhasil dihapus dari database.`

}, {
    name: "hapus_jadwal",
    description: "Gunakan alat ini untuk membantu Fadhra menghapus jadwal yang sudah tidak diperlukan lagi.",
    schema: z.object({
        id: z.string().describe("ID unik dari jadwal yang ingin dihapus. Bisa didapatkan dari tool 'lihat_jadwal'."),
        activity: z.string().optional().describe("Nama kegiatan. Hanya untuk konteks, tidak digunakan dalam logika penghapusan."),
    })
})