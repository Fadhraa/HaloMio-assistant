import { exec } from "child_process";
import { tool } from '@langchain/core/tools';
import { z } from "zod"
const pintasanWeb = {
    "youtube": "https://www.youtube.com",
    "yt": "https://www.youtube.com",
    "netflix": "https://www.netflix.com",
    "github": "https://github.com",
    "whatsapp": "https://web.whatsapp.com",
    "wa": "https://web.whatsapp.com",
    "chatgpt": "https://chatgpt.com",
    "google": "https://www.google.com"
}
export const toolBukaBrowser = tool(async ({ query }) => {
    let url
    const katakunci = query.toLowerCase();
    if (pintasanWeb[katakunci]) {
        url = pintasanWeb[katakunci]

    } else if (query.includes('.') && !query.includes(' ')) {
        url = query.startsWith('http') ? query : `https://${query}`;
    } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    console.log("Mio sedang membuka browser untuk", query);
    exec(`start "" "${url}"`, (error) => {
        if (error) {
            console.error(`Mio: Maaf, gagal membuka browser. Error: ${error.message}`);
        }
    });
    return `Sukses. Browser telah di buka untuk "${query}"`
}, {
    name: 'buka_browser',
    description: 'Gunakan tool ini SETIAP USER meminta untuk membuka website, aplikasi web, atau mencari informasi di google atau internet. JANGAN gunakan tool ini untuk tugas lainnya.',
    schema: z.object({
        query: z.string().describe('Nama website atau kata kunci pencarian murni yang ingin dibuka')
    })
})