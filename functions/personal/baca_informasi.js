import fs from "fs";
import { tool } from "langchain";
import z from "zod";
import path from "path";

export const toolBacaInformasi = tool(async () => {
    const filePath = path.join(process.cwd(), "memory", "information.json");
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return `Berikut adalah semua informasi personal Fadhra di database:\n${data}`;
    }
    return "Tidak ada informasi yang tersimpan tentang Fadhra.";
}, {
    name: "baca_informasi",
    description: "Gunakan alat ini untuk membaca seluruh informasi/database yang tersimpan tentang Fadhra. LLM bisa membaca seluruh datanya dan mencari jawabannya sendiri.",
})

