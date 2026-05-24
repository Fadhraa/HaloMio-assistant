import readline from 'readline';
import { spawn } from 'child_process';
import { ChatOllama } from "@langchain/ollama";

import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";

import { ChatPromptTemplate } from "@langchain/core/prompts";

// 1. MENGIMPOR TOOL YANG BARU SAJA ANDA BUAT (Jangan lupa akhiran .js)
import { toolBukaBrowser } from './functions/buka_browser.js';
// fungsi mengambil waktu saat ini
import { get_currentTime } from "./functions/get_currentTime.js";
// using model
const Brain = new ChatOllama({
    model: "minimax-m2.5:cloud",
    temperature: 0
});
const rulesAi = ChatPromptTemplate.fromMessages([
    ["system", `Kamu adalah asisten AI di komputer Fadhra bernama Mio. Jadilah asisten yang ramah buat fadhra. 
Gunakan alat (tools) yang tersedia HANYA jika pengguna menyuruhmu membuka aplikasi, website, mencari sesuatu di internet, atau memutar musik.
Jika Fadhra hanya mengajak ngobrol, jawablah dengan bahasa Indonesia yang santai tanpa menggunakan tool.`],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
])
const listTools = [toolBukaBrowser, get_currentTime]

// creating agent
const Mio = createToolCallingAgent({
    llm: Brain,
    prompt: rulesAi,
    tools: listTools
})

// wrapping agent dalam executor agar bisa memproses tool
const executer = new AgentExecutor({ agent: Mio, tools: listTools });

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
        const result = await executer.invoke({ input: promptUser });
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log("Mio: ", result.output);
    } catch (error) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log("Mio: Maaf, sepertinya ada kesalahan.");
    }
}
// input voice or keyboard
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
function tanyaAi(inputSuara = null) {
    if (inputSuara) {
        console.log(`Fadhra menyuruh: ${inputSuara}`);
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
telinga.stderr.on('data', (data) => {
    console.error(`[Mic Error]: ${data}`);
});