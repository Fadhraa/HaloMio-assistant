import { tool } from "@langchain/core/tools";
import z from "zod";
import fs from "fs";
import path from "path";


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