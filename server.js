import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { jalankanMio } from "./agent.js";
import { ambilJadwal } from "./controllers/jadwalController.js";
import { getBriefingDashboard } from "./services/briefingService.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi model Gemini Vision secara malas (lazy loading)
let visionModel = null;
function dapatkanVisionModel() {
  if (!visionModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env");
    }
    visionModel = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash",
      modelName: "gemini3.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2,
    });
  }
  return visionModel;
}

// Fungsi untuk menganalisis gambar base64 menggunakan Gemini 1.5 Flash
async function analisisGambarDenganGemini(base64DataUrl) {
  const model = dapatkanVisionModel();
  const pesanGambar = new HumanMessage({
    content: [
      {
        type: "text",
        text: "Jelaskan gambar ini secara detail, terperinci, dan jelas dalam Bahasa Indonesia. Deskripsikan apa yang terjadi, teks apa yang tertulis (jika ada), elemen UI, atau objek yang terlihat agar asisten AI lain dapat memahaminya sebagai konteks percakapan.",
      },
      {
        type: "image_url",
        image_url: {
          url: base64DataUrl,
        },
      },
    ],
  });

  const response = await model.invoke([pesanGambar]);
  return response.content;
}

// Fungsi pembungkus untuk menjalankan web server
export function mulaiServer(port = 3000) {
  const app = express();

  // Middleware parsing JSON
  app.use(express.json({ limit: "20mb" }));

  // Menyajikan file statis front-end
  const webFolder = path.join(process.cwd(), "..", "web", "dist");
  app.use(express.static(webFolder));

  // API Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    const { message, image } = req.body;

    if (!message && !image) {
      return res
        .status(400)
        .json({ error: "Pesan atau gambar tidak boleh kosong." });
    }

    let inputUntukMio = message || "";
    let visualDescription = "";

    try {
      // Jika ada kiriman gambar, analisis dulu dengan Gemini Flash
      if (image) {
        console.log("📸 Menganalisis gambar menggunakan Gemini 1.5 Flash...");
        visualDescription = await analisisGambarDenganGemini(image);
        console.log("🔍 Hasil Analisis Gambar:", visualDescription);

        // Sisipkan deskripsi visual ini sebagai konteks tambahan bagi Agen Utama Mio
        inputUntukMio = `[Gambar yang diunggah/di-paste oleh Fadhra]:\n${visualDescription}\n\n[Pesan/Pertanyaan Fadhra]:\n${message || "Jelaskan gambar tersebut."}`;
      }

      // Jalankan Mio AI (dari agent.js)
      console.log(`🤖 Mio sedang berpikir memproses request...`);
      const jawabanMio = await jalankanMio(
        inputUntukMio,
        message || "mengunggah gambar",
      );

      res.json({
        reply: jawabanMio,
        analysis: visualDescription || null,
      });
    } catch (error) {
      console.error("[ERROR API CHAT]:", error);
      res
        .status(500)
        .json({ error: error.message || "Terjadi kesalahan sistem internal." });
    }
  });
  app.get("/api/jadwal", ambilJadwal);
  app.get("/api/dashboard/briefing", async (req, res) => {
    try {
      const isFresh = req.query.fresh === "true";
      const hasil = await getBriefingDashboard("Fadhra", isFresh);
      res.json(hasil);
    } catch (err) {
      console.error("Gagal mengambil briefing:", err);
      res.status(500).json({ error: "Gagal memproses briefing AI" });
    }
  });
  // Mulai mendengarkan request
  app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Mio Web Server aktif di: http://localhost:${port}`);
    console.log(`======================================================\n`);
  });
}
