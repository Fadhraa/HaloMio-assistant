import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Tempel URL Web App dari Google Apps Script yang sudah Anda salin tadi di bawah ini
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;


export const toolTambahGoogleDoc = tool(async ({ title, content }) => {
    try {
        console.log(`\n[Google Docs] Sedang membuat dokumen "${title}"...`);

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) {
            throw new Error(`Koneksi HTTP Gagal! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "error") {
            throw new Error(result.message);
        }

        return `Sukses membuat Google Doc baru!\nJudul: "${title}"\nTautan dokumen: ${result.url}`;
    } catch (error) {
        console.error("[Google Docs Error]:", error);
        return `Gagal membuat Google Doc: ${error.message}`;
    }
}, {
    name: "tambah_google_doc",
    description: "Gunakan alat ini JIKA Fadhra meminta Anda untuk membuat dokumen baru, menulis laporan, rangkuman materi, esai panjang, atau Google Docs baru.",
    schema: z.object({
        title: z.string().describe("Judul dokumen Google Docs yang akan dibuat"),
        content: z.string().describe("Isi lengkap teks tulisan/laporan akademik yang akan dimasukkan ke dalam Google Docs.")
    })
});
