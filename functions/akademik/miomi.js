import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Import tool khusus akademik
import { toolMenulisTugas, toolBacaTugas, toolEditTugas } from "./tugas.js";

// getcurrent time
import { get_currentTime } from "../get_currentTime.js";

// 1. Inisialisasi Otak Miomi (Kita bisa pakai model yang sama atau berbeda)
const otakMiomi = new ChatOllama({
    model: "minimax-m2.5:cloud", // Ganti dengan model pilihanmu
    // model: "gemma4:31b-cloud",
    temperature: 0.1
});

// 2. Beri Kepribadian dan Instruksi Khusus Miomi
const rulesMiomi = ChatPromptTemplate.fromMessages([
    ["system", `Kamu adalah Miomi, asisten spesialis akademik yang teliti dan cerdas milik Fadhra. 
Fokus utamamu HANYA membantu kegiatan belajar, mencatat tugas, merangkum materi, dan hal terkait sekolah/kuliah. 
Kerjakan instruksi yang diberikan dengan sebaik mungkin menggunakan tool yang kamu miliki.`],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"]
]);

// 3. Gabungkan Miomi dengan Tool-nya
const toolsMiomi = [toolMenulisTugas, toolBacaTugas, get_currentTime, toolEditTugas];
const agenMiomi = createToolCallingAgent({
    llm: otakMiomi,
    prompt: rulesMiomi,
    tools: toolsMiomi
});
const miomiExecutor = new AgentExecutor({ agent: agenMiomi, tools: toolsMiomi });

// 4. JADIKAN MIOMI SEBAGAI "TOOL" UNTUK MIO
export const panggilMiomi = tool(async ({ instruksi }) => {
    console.log(`\n[Koordinasi] Mio sedang meminta bantuan Miomi: "${instruksi}"...\n`);

    // Mio mengirimkan perintah ke Miomi
    const result = await miomiExecutor.invoke({ input: instruksi });

    return result.output;
}, {
    name: "panggil_agen_akademik_miomi",
    description: "PENTING: Gunakan alat ini JIKA Fadhra meminta bantuan terkait akademik, tugas sekolah/kuliah, belajar, atau MENCATAT/MENYIMPAN tugas baru. Berikan instruksi yang jelas kepada Miomi agar dia bisa mengerjakannya.",
    schema: z.object({
        instruksi: z.string().describe("Perintah lengkap dan spesifik tentang apa yang harus Miomi kerjakan untuk Fadhra.")
    })
});
