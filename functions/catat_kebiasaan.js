import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { simpanKebiasaan } from './habit_memory.js';

export const toolCatatKebiasaan = tool(async ({ kunci, deskripsi, target }) => {
    try {
        await simpanKebiasaan(kunci, deskripsi, target);
        console.log(`[Memori] Berhasil mencatat kebiasaan: ${kunci} -> ${target}`);
        return `Sukses mencatat kebiasaan baru: "${kunci}" untuk "${deskripsi}" dengan target "${target}".`;
    } catch (err) {
        console.error(`[Memori Error] Gagal mencatat kebiasaan: ${err.message}`);
        return `Gagal mencatat kebiasaan: ${err.message}`;
    }
}, {
    name: 'catat_kebiasaan',
    description: 'Gunakan alat ini HANYA ketika Fadhra secara eksplisit memberi tahu atau memperbarui kebiasaan, preferensi, atau pintasan pribadinya (contoh: "kalau mau nulis laporan biasanya pake Google Doc", "biasanya kalau nonton anime buka otaku desu").',
    schema: z.object({
        kunci: z.string().describe('Kata kunci pendek unik untuk kebiasaan ini (gunakan huruf kecil dan underscore, contoh: "nonton_anime", "menulis_laporan", "main_game")'),
        deskripsi: z.string().describe('Penjelasan aktivitas kebiasaan tersebut, contoh: "menulis laporan bulanan" atau "menonton anime musiman"'),
        target: z.string().describe('Nama aplikasi atau alamat URL website lengkap yang digunakan, contoh: "docs.google.com", "otakudesu.cloud", "wuthering waves"')
    })
});
