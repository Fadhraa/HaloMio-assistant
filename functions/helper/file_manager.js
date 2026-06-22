import fs from "fs";
import path from "path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const toolKelolaFileLokal = tool(async ({ aksi, tipe, nama, isi, pathTujuan }) => {
    const baseDir = process.cwd(); // d:\coding\HaloMio\assistant
    const relativePath = pathTujuan || "";
    const targetName = nama || "";
    const absolutePath = path.join(baseDir, relativePath, targetName);
    const resolvedPath = path.resolve(absolutePath);

    // Proteksi Directory Traversal: Jangan biarkan mengakses di luar workspace
    if (!resolvedPath.startsWith(baseDir)) {
        return `Gagal: Aksi dibatalkan karena lokasi tujuan berada di luar direktori workspace HaloMio demi keamanan.`;
    }

    try {
        // --- AKSI: BUAT ---
        if (aksi === "buat") {
            if (!nama) return "Gagal: Parameter 'nama' wajib diisi untuk membuat file atau folder.";

            if (tipe === "folder") {
                if (fs.existsSync(resolvedPath)) {
                    return `Folder "${nama}" sudah ada di lokasi "${relativePath || "./"}".`;
                }
                fs.mkdirSync(resolvedPath, { recursive: true });
                return `Sukses membuat folder baru "${nama}" di lokasi "${relativePath || "./"}".`;
            } else if (tipe === "file") {
                const parentDir = path.dirname(resolvedPath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }

                const isOverwritten = fs.existsSync(resolvedPath);
                fs.writeFileSync(resolvedPath, isi || "", "utf-8");

                if (isOverwritten) {
                    return `Sukses menimpa (overwrite) file "${nama}" di lokasi "${relativePath || "./"}".`;
                } else {
                    return `Sukses membuat file baru "${nama}" di lokasi "${relativePath || "./"}".`;
                }
            }
        }

        // --- AKSI: BACA ---
        if (aksi === "baca") {
            if (!fs.existsSync(resolvedPath)) {
                return `Gagal: Target tidak ditemukan di lokasi "${relativePath || "./"}${targetName ? "/" + targetName : ""}".`;
            }

            const stats = fs.statSync(resolvedPath);

            if (tipe === "folder") {
                if (!stats.isDirectory()) {
                    return `Gagal: Target "${targetName}" bukan merupakan folder/direktori.`;
                }
                const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
                if (items.length === 0) {
                    return `Folder "${targetName || "root"}" kosong.`;
                }

                let result = `Daftar isi folder "${targetName || "root"}" di lokasi "${relativePath || "./"}":\n`;
                items.forEach(item => {
                    const icon = item.isDirectory() ? "📁" : "📄";
                    result += `${icon} ${item.name}\n`;
                });
                return result;
            }

            if (tipe === "file") {
                if (!stats.isFile()) {
                    return `Gagal: Target "${targetName}" bukan merupakan file berkas teks.`;
                }
                const content = fs.readFileSync(resolvedPath, "utf-8");
                return `Isi file "${targetName}" di lokasi "${relativePath || "./"}":\n\n${content}`;
            }
        }

        return `Gagal: Aksi "${aksi}" dengan tipe "${tipe}" tidak didukung.`;
    } catch (error) {
        console.error("[File Manager Error]:", error);
        return `Gagal mengelola file/folder lokal: ${error.message}`;
    }
}, {
    name: "kelola_file_lokal",
    description: "Gunakan alat ini untuk MEMBUAT atau MEMBACA file teks dan folder di komputer lokal (terbatas di dalam workspace HaloMio). Aksi 'buat' menulis file (menimpa jika sudah ada) atau membuat direktori. Aksi 'baca' menampilkan daftar isi direktori atau membaca isi file teks.",
    schema: z.object({
        aksi: z.enum(["buat", "baca"]).describe("Aksi yang ingin dijalankan: 'buat' untuk menulis/membuat baru, 'baca' untuk membaca file/direktori."),
        tipe: z.enum(["file", "folder"]).describe("Tipe objek: 'file' untuk berkas teks, 'folder' untuk direktori/folder."),
        nama: z.string().optional().describe("Nama berkas atau folder (contoh: 'index.html' atau 'src'). Kosongkan saat aksi 'baca' tipe 'folder' jika ingin membaca langsung folder di pathTujuan."),
        isi: z.string().optional().describe("Konten isi file teks (Hanya digunakan untuk aksi 'buat' dengan tipe 'file')."),
        pathTujuan: z.string().optional().describe("Path direktori relatif di dalam workspace, dihitung dari folder asisten/ (contoh: 'memory' atau 'mio_website'). Kosongkan jika ingin mengakses root folder asisten.")
    })
});
