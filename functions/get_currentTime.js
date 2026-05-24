import { tool } from "@langchain/core/tools";
import { z } from "zod";
export const get_currentTime = tool(async () => {
    const date = new Date();
    return date.toLocaleString('id-ID', {
        dateStyle: "full",
        timeStyle: "short"
    });
}, {
    name: "get_currentTime",
    description: "Mengambil waktu saat ini",
    schema: z.object({})
})