import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// tool
import { get_currentTime } from "../get_currentTime.js";
import { kelolaInformasiFadhra } from "./kelola_informasi.js";
import { toolCatatKebiasaan } from "./catat_kebiasaan.js";
// setup Nalomi
const otakNalomi = new ChatOllama({
    model: "minimax-m2.5:cloud", // Ganti dengan model pilihanmu
    // model: "gemma4:31b-cloud",
    temperature: 0.1
});
const rulesMiomi = ChatPromptTemplate.fromMessages([
    ["system", `Kamu adalah Nalomi, asisten spesialis personal yang ramah dan sopan, dan sangat peduli terhadap Fadhra. 
Fokus utamamu HANYA membantu kegiatan pribadi Fadhra, dan hal terkait pribadi Fadhra, seperti mecatat informasi tentang fadhra, mengingatkan jadwal penting fadhra, dll. 
Kerjakan instruksi yang diberikan dengan sebaik mungkin menggunakan tool yang kamu miliki.`],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"]
]);

const toolsNalomi = [get_currentTime, kelolaInformasiFadhra, toolCatatKebiasaan];
const agentNalomi = createToolCallingAgent({
    llm: otakNalomi,
    prompt: rulesMiomi,
    tools: toolsNalomi
});

const nalomiExecutor = new AgentExecutor({ agent: agentNalomi, tools: toolsNalomi });

// JADIKAN MIOMI SEBAGAI "TOOL" UNTUK MIO
export const panggilNalomi = tool(async ({ instruksi }) => {
    console.log(`\n[Koordinasi] Mio sedang meminta bantuan Nalomi: "${instruksi}"...\n`);

    // Mio mengirimkan perintah ke Miomi
    const result = await nalomiExecutor.invoke({ input: instruksi });

    return result.output;
}, {
    name: "panggil_agen_personal_nalomi",
    description: "PENTING: gunakan alat ini untuk keperluan pribadi fadhra seperti membuat jadwal, dan keperluan pribadi lainnya",
    schema: z.object({
        instruksi: z.string().describe("Perintah lengkap dan spesifik tentang apa yang harus Nalomi kerjakan untuk Fadhra.")
    })
});