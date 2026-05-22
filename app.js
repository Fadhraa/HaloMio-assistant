const readline = require('readline');
const { bukaBrowser } = require('./functions/buka_browser');
const { default: ollama } = require('ollama'); // Cara panggil Ollama di CommonJS

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("=========================================");
console.log("🤖 Halo! Saya adalah Asisten Bot AI Anda.");
console.log("Ketik 'buka [sesuatu]' untuk membuka browser.");
console.log("Ketik 'exit' untuk keluar.");
console.log("Atau tanyakan apa saja kepada saya!");
console.log("=========================================\n");

function tanyaBot() {
    rl.question('Anda: ', async (input) => {
        const text = input.trim();
        const textLower = text.toLowerCase();

        // 1. Jika perintah adalah exit
        if (textLower === 'exit' || textLower === 'keluar') {
            console.log('🤖 Bot: Sampai jumpa! Semoga harimu menyenangkan.');
            rl.close();
            return;
        }

        // 2. Jika perintah adalah untuk membuka browser
        if (textLower.startsWith('buka ')) {
            const query = textLower.substring(5).trim();
            bukaBrowser(query);
            tanyaBot();
        }
        // 3. Jika perintah berupa obrolan biasa, berikan ke Ollama
        else if (text.length > 0) {
            process.stdout.write("🤖 Bot sedang berpikir... ");

            try {
                const systemPrompt = `Anda adalah asisten AI di komputer Fadhra. 
Jika pengguna meminta untuk membuka website, memutar film, mendengarkan lagu, atau mencari sesuatu di internet, Anda WAJIB membalas HANYA dengan format JSON: {"action": "buka_browser", "query": "nama_aplikasi_atau_kata_kunci"}.
Contoh: Jika user berkata "aku ingin nonton naruto", balas HANYA dengan {"action": "buka_browser", "query": "youtube"}.
Jika pengguna HANYA mengajak ngobrol biasa, balas dengan bahasa manusia biasa tanpa JSON.`;
                const response = await ollama.chat({
                    // Catatan: Pastikan model ini sudah Anda download di Ollama komputer Anda
                    model: 'minimax-m2.5:cloud',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                });
                const aiReply = response.message.content.trim();
                // 2. Menghapus status loading
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);

                let parsedData;
                try {
                    let cleanReply = aiReply.replace(/```json/gi, '').replace(/```/g, '').trim();
                    parsedData = JSON.parse(cleanReply);
                } catch (e) {
                    // Jika gagal parse JSON (karena bot ngobrol biasa), tampilkan jawaban normal
                    console.log(`🤖 Bot: ${aiReply}`);
                    tanyaBot();
                    return;
                }

                // 3. Memeriksa apakah AI ingin membuka browser
                if (parsedData.action === 'buka_browser' && parsedData.query) {
                    const query = parsedData.query;
                    console.log(`🤖 Bot: Siap membuka browser untuk "${query}"...`);
                    bukaBrowser(query);
                } else {
                    // Jika format JSON benar tapi action tidak dikenali, tampilkan sebagai chat
                    console.log(`🤖 Bot: ${aiReply}`);
                }
            } catch (error) {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                console.log(`🤖 Bot: Maaf, gagal menghubungi Ollama. Pastikan aplikasi Ollama berjalan. Error: ${error.message}`);
            }

            tanyaBot();
        } else {
            tanyaBot();
        }
    });
}

// Mulai interaksi
tanyaBot();
