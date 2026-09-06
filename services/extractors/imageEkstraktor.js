import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import path from "path";
import fs from "fs";

const MEDIA_DIR = path.join(process.cwd(), "storage", "media");

let visionModel = null;

function dapatVisionModel() {
  if (!visionModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY tidak tersedia");
    }
    visionModel = new ChatGoogleGenerativeAI({
      model: "gemini-3.1-flash-lite",
      modelName: "gemini-3.1-flash-lite",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2,
    });
  }
  return visionModel;
}
export async function prosesEkstraksiGambar(pesanWa, key) {
  try {
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
    const buffer = await downloadMediaMessage(pesanWa, "buffer", {});

    const timeStamp = Date.now();
    const namaFile = `vlt_img_${timeStamp}_${key.id}.jpg`;
    const pathFileLokal = path.join(MEDIA_DIR, namaFile);
    fs.writeFileSync(pathFileLokal, buffer);
    console.log(`📁 Gambar disimpan ke lokal: ${pathFileLokal}`);

    const base64Data = buffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    const model = dapatVisionModel();
    const promptVision = `Analisis gambar/screenshot ini dan berikan keluaran format JSON terstruktur persis seperti berikut (tanpa blok markdown):
{
  "judul": "Judul ringkas yang menggambarkan isi gambar (misal: 'Judul Lagu: Nanti - Fredy' atau 'Grafik Osiloskop')",
  "kategori": "Pilih salah satu paling sesuai: 'musik_lagu' | 'praktikum' | 'tangkapan_layar' | 'poster_event' | 'catatan_akademik' | 'referensi'",
  "ringkasan": "Hasil OCR teks penting yang terlihat dan penjelasan ringkas gambar dalam Bahasa Indonesia.",
  "tags": ["tag1", "tag2"]
}`;

    const pesanGambar = new HumanMessage({
      content: [
        {
          type: "text",
          text: promptVision,
        },
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
      ],
    });
    const response = await model.invoke([pesanGambar]);

    let dataAI = {};
    try {
      // Pembersihan format jika AI menyertakan blok ```json
      const jsonClean = response.content.replace(/```json/g, "").replace(/```/g, "").trim();
      dataAI = JSON.parse(jsonClean);
    } catch (e) {
      dataAI = {
        judul: "Tangkapan Gambar",
        kategori: "tangkapan_layar",
        ringkasan: response.content,
        tags: ["gambar"],
      };
    }

    return {
      tipe: "gambar",
      judul: dataAI.judul || "Tangkapan Gambar",
      kategori: dataAI.kategori || "tangkapan_layar",
      ringkasan: dataAI.ringkasan || response.content,
      tags: dataAI.tags || ["gambar"],
      file_path: pathFileLokal,
      file_name: namaFile,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[ERROR IMAGE EXTRACTOR]:", error);
    return null;
  }
}
