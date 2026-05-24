const readline = require('readline');
const { bukaBrowser } = require('./functions/buka_browser');
const { default: ollama } = require('ollama'); // Cara panggil Ollama di CommonJS
const { spawn } = require('child_process');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
async function prosesPerintahAI(text) {
    if (!text) return;

    const textLower = text.toLowerCase();
    if (textLower === 'exit' || textLower === 'keluar' || textLower.includes('matikan program')) {
        console.log(' Mio: Sampai jumpa! Semoga harimu menyenangkan.');
        process.exit(0); // Mematikan program sepenuhnya
    }
    process.stdout.write("Mio sedang berpikir... ");
    try {
        const systemPrompt = `Anda adalah asisten AI di komputer Fadhra. 
Jika pengguna meminta untuk membuka website, memutar film, mendengarkan lagu, atau mencari sesuatu di internet, Anda WAJIB membalas HANYA dengan format JSON: {"action": "buka_browser", "query": "nama_aplikasi_atau_kata_kunci"}.
Contoh: Jika user berkata "aku ingin nonton naruto", balas HANYA dengan {"action": "buka_browser", "query": "youtube"}.
Jika pengguna HANYA mengajak ngobrol biasa, balas dengan bahasa manusia biasa tanpa JSON.`;

        const response = await ollama.chat({
            model: 'minimax-m2.5:cloud',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
        });

        const aiReply = response.message.content.trim();
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        let parsedData;
        try {
            let cleanReply = aiReply.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanReply);
        } catch (e) {
            console.log(`Mio: ${aiReply}`);
            return; // Selesai
        }
        if (parsedData.action === 'buka_browser' && parsedData.query) {
            console.log(`Mio: Siap membuka browser untuk "${parsedData.query}"...`);
            bukaBrowser(parsedData.query);
        } else {
            console.log(`Mio: ${aiReply}`);
        }
    } catch (error) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(`Mio: Maaf, gagal menghubungi Ollama. Error: ${error.message}`);
    }
}
async function tanyaBot(input) {
    if (input) {
        prosesPerintahAI(input).then(() => {
            tanyaBot();
        })
    }
    else {
        rl.question('Anda: ', (input) => {
            prosesPerintahAI(input).then(() => {
                tanyaBot();
            })
        })
    }
}

// // Mulai interaksi
// tanyaBot();
const telinga = spawn('python', ['telinga.py']);
telinga.stdout.on('data', async (data) => {

    const barisData = data.toString().split('\n');

    for (let hasilSuara of barisData) {
        hasilSuara = hasilSuara.trim();
        if (!hasilSuara) continue;
        if (hasilSuara === 'READY') {
            console.log("👂 Mio sudah bangun! Coba katakan: 'Halo Mio buka youtube'");
            continue;
        }
        if (hasilSuara.startsWith('DEBUG:')) {
            console.log(hasilSuara);
            continue;
        }
        // HAPUS blok If yang lama, langsung gunakan If yang ini:
        if (hasilSuara.startsWith('PERINTAH:')) {
            const perintahAsli = hasilSuara.replace('PERINTAH:', '').trim();
            if (perintahAsli) {
                console.log(`\n🗣️ [Suara Terdeteksi]: "${perintahAsli}"`);
                tanyaBot(perintahAsli); // Kirim teks yang sudah bersih
            }
        }
    }
});
telinga.stderr.on('data', (data) => {
    // Jika mikrofon error, pesan akan muncul di sini
    console.error(`[Mic Error]: ${data}`);
});