import 'dotenv/config';
import readline from 'readline';
import { spawn } from 'child_process';
import { ChatOllama } from "@langchain/ollama";

import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
// rekam latarbelakang
import { rekamMemoriLatar } from "./functions/background/observasi_percakapan.js";
// fungsi  akademik
import { panggilMiomi } from "./functions/akademik/miomi.js";
// Fungsi file lokal
import { toolKelolaFileLokal } from "./functions/helper/file_manager.js";
// fungsi Personal
import { panggilNalomi } from "./functions/personal/nalomi.js";
// fungsi buka browser
import { toolBukaBrowser } from './functions/buka_browser.js';
// fungsi mengambil waktu saat ini
import { get_currentTime } from "./functions/get_currentTime.js";
// fungsi aktivitas
import { toolCekAktivitas } from "./functions/cek_aktivitas.js";
// Fungsi buat google doc
import { toolKelolaGoogleDoc } from "./functions/akademik/docs.js";
// buka aplikasi
import { toolBukaAplikasi } from "./functions/buka_aplikasi.js";
// Membaca kebiasaan fadhra (dihapus dari sini karena sudah dipindah ke Nalomi)
import { dapatkanKebiasaan } from "./functions/habit_memory.js";
// pemakaian model
const Brain = new ChatOllama({
    // model: "minimax-m2.5:cloud",
    model: "gemma4:31b-cloud",
    temperature: 0
});


// Setup MIO
const rulesMio = ChatPromptTemplate.fromMessages([
    ["system", `Kamu adalah asisten AI di komputer milik Fadhra bernama Mio. 
ATURAN PENTING:
1. SELALU gunakan Bahasa Indonesia yang santai, natural, dan ramah. JANGAN PERNAH menggunakan bahasa Mandarin/China atau bahasa asing lainnya kecuali Fadhra memintanya dan jangan merespon dengan bahasa yang terlalu kaku seperti robot HINDARI penggunaan kata lo/gue.
2. Namamu adalah Mio, dan pengguna (orang yang mengajakmu bicara) bernama Fadhra. Panggil pengguna dengan nama "Fadhra". JANGAN PERNAH memanggil pengguna dengan sebutan "Mio".
3. Jika Fadhra mengakhiri kalimatnya dengan memanggil namamu (contoh: "nama pacarku dania mio", maksudnya "nama pacarku dania, hai mio"), JANGAN menganggap kata "mio" tersebut sebagai bagian dari nama orang/benda.
4. Jika Fadhra memberikan beberapa perintah yang berbeda dalam satu pesan sekaligus (contoh: mencatat jadwal pribadi sekaligus mencatat tugas akademik), kamu WAJIB memanggil kedua alat koordinasi sub-agen (Miomi & Nalomi) secara bersamaan (parallel tool calling).

Gunakan alat (tools) yang tersedia JIKA pengguna menyuruhmu melakukan aksi di komputer (buka aplikasi/web) ATAU mencari tahu informasi yang tidak kamu ketahui.

PANDUAN PENGGUNAAN ALAT KHUSUS:
- Jika Fadhra menyuruh MEMBUAT, MENGEDIT, MENGHAPUS, atau MELIHAT DAFTAR/JUMLAH dokumen Google Docs, gunakan alat 'kelola_google_doc'.
- Jika Fadhra menyuruh MEMBUAT, MEMBACA, atau MENGEDIT file teks, serta melihat daftar folder/file di komputer lokal, gunakan alat 'kelola_file_lokal'.
- PENTING: Sebelum mengedit, memodifikasi, atau memperbaiki berkas file lokal yang sudah ada, Anda WAJIB memanggil 'kelola_file_lokal' dengan aksi 'baca' terlebih dahulu untuk mengetahui kontennya saat ini agar tidak terjadi salah tulis.
- Jika Google Doc tersebut memerlukan data dari memori (seperti jadwal, data kebiasaan, atau informasi pribadi), Anda WAJIB memanggil 'panggil_agen_personal_nalomi' terlebih dahulu untuk mengambil data tersebut. Jika memerlukan data tugas/akademik, panggil 'panggil_agen_akademik_miomi'. Setelah mendapatkan data tersebut dari sub-agen, gunakan hasilnya untuk memanggil 'kelola_google_doc'.
- Jika Fadhra menginformasikan tugas akademik, LANGSUNG gunakan alat 'panggil_agen_akademik_miomi' saat itu juga dengan informasi seadanya. JANGAN banyak bertanya detail tambahan kepada Fadhra.
- Jika Fadhra MENANYAKAN sesuatu tentang dirinya (contoh: 'siapa nama pacarku?') ATAU menyuruh MENCATAT JADWAL/AGENDA di masa depan (contoh: 'besok jam 8 pagi aku mau ke kelurahan'), LANGSUNG gunakan alat 'panggil_agen_personal_nalomi'.
- Jika Fadhra hanya mengajak ngobrol, curhat, atau bercerita, jawablah dengan empati dan bahasa Indonesia yang santai tanpa menggunakan tool. Biarkan sistem latar belakang yang mengurus pencatatan fakta.

Berikut preferensi/kebiasaan Fadhra yang mungkin relevan dengan percakapan saat ini:
{memori_kebiasaan}`],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
])
const listTools = [
    toolBukaBrowser,
    get_currentTime,
    toolCekAktivitas,
    toolBukaAplikasi,
    toolKelolaGoogleDoc,
    toolKelolaFileLokal,
    panggilMiomi,
    panggilNalomi,

];

// creating agent
const Mio = createToolCallingAgent({
    llm: Brain,
    prompt: rulesMio,
    tools: listTools
})

// wrapping agent dalam executor agar bisa memproses tool
const executer = new AgentExecutor({ agent: Mio, tools: listTools });
// SHORT term memory
let chatHistory = [];
const MAKS_HISTORY = 10; // Maksimal jumlah pesan yang disimpan
async function prosesWithAi(text) {
    if (!text) {
        return
    };
    const promptUser = text.toLowerCase();
    if (promptUser.includes('exit') || promptUser.includes('berhenti') || promptUser.includes('matikan program')) {
        console.log(`Mio: Sampai jumpa, Fadhra! `);
        process.exit(0);
    };
    try {
        // Dapatkan memori relevan sebelum memanggil agent
        const memori = await dapatkanKebiasaan(promptUser);

        // Panggil agent Observer di latar belakang
        rekamMemoriLatar(promptUser, chatHistory);
        const result = await executer.invoke({
            input: promptUser,
            memori_kebiasaan: memori,
            chat_history: chatHistory // Memasukkan riwayat obrolan ke dalam otak Mio
        });
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log("Mio: ", result.output);
        // SIMPAN HISTORY (Short Term Memory)
        chatHistory.push(new HumanMessage(text));
        chatHistory.push(new AIMessage(result.output));

        // Jaga agar chatHistory tidak terlalu panjang (agar context tetap fresh)
        if (chatHistory.length > MAKS_HISTORY) {
            // Buang pesan paling lama (index 0)
            chatHistory = chatHistory.slice(1);
        }
    } catch (error) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log("Mio: Maaf, sepertinya ada kesalahan.");
        console.error("[DEBUG ERROR]:", error);
    }
}
// input voice or keyboard
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
function tanyaAi(inputSuara = null) {
    if (inputSuara) {
        console.log(`${inputSuara}`);
        prosesWithAi(inputSuara).then(() => {
            tanyaAi();
        }).catch((error) => {
            console.log("Mio: Maaf, sepertinya ada kesalahan.");
            tanyaAi();
        })
    } else {
        rl.question('Fadhra: ', async (text) => {
            await prosesWithAi(text)
            tanyaAi()
        })
    }
}
// connect with python
const telinga = spawn('python', ['telinga.py']);
telinga.stdout.on('data', async (data) => {
    const barisData = data.toString().split('\n');
    for (let hasilSuara of barisData) {

        hasilSuara = hasilSuara.trim();
        if (!hasilSuara) continue;
        if (hasilSuara === 'READY') {
            console.log("Mio: halo Fadhra!");
            tanyaAi();
            continue;
        }

        if (hasilSuara.startsWith('DEBUG:')) {
            console.log(`🦻 ${hasilSuara}`);
            continue;
        }

        if (hasilSuara.startsWith('PERINTAH:')) {
            const perintahAsli = hasilSuara.replace('PERINTAH:', '').trim();

            tanyaAi(perintahAsli);
            continue;
        }

        // Fallback untuk debugging
        console.log(`🦻 RAW: ${hasilSuara}`);
    }
})
const pelacak = spawn('node', ['track.js'], { cwd: '../tracking' });
telinga.stderr.on('data', (data) => {
    console.error(`[Mic Error]: ${data}`);
});