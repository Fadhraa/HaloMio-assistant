import makeWaSocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { getLastSyncTime, saveLastSyncedTimestamp } from "./waSyncService.js";
import qrcode from "qrcode-terminal";
import { periksaKeamanan } from "./extractors/keamananPrivasi.js";
import {
  ekstrakUrldariTeks,
  ambilDataWeb,
} from "./extractors/linkEkstraktor.js";
import { prosesEkstraksiGambar } from "./extractors/imageEkstraktor.js";
import pino from "pino";
import path from "path";
import fs from "fs";

const SESSION_DIR = path.join(process.cwd(), "Wa_session");
let sockWA = null;

export function koneksiKeWA() {
  return new Promise((resolve, reject) => {
    async function hubungkan() {
      try {
        if (!fs.existsSync(SESSION_DIR)) {
          fs.mkdirSync(SESSION_DIR, { recursive: true });
        }
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();

        const createSocket = makeWaSocket.default || makeWaSocket;
        if (sockWA) {
          try {
            sockWA.end();
          } catch (e) {}
        }
        sockWA = createSocket({
          version,
          logger: pino({ level: "silent" }),
          printQRInTerminal: false,
          auth: state,
          browser: ["Mio Personal Assistant", "Chrome", "1.0.0"],
        });
        const TARGET_GROUP_JID = GROUP_WA_ID;

        sockWA.ev.on("messages.upsert", async ({ messages, type }) => {
          if (type !== "notify") return;
          const lastSyncTime = getLastSyncTime();
          const sortedMessages = messages.sort(
            (a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0),
          );
          for (const msg of sortedMessages) {
            // Filter 1: Pesan dari diri sendiri
            if (!msg.key.fromMe) continue;

            // Filter 2: Harus dikirim di Grup Khusus Mio
            if (msg.key.remoteJid !== TARGET_GROUP_JID) continue;
            const msgTimestamp =
              msg.messageTimestamp || Math.floor(Date.now() / 1000);
            if (msgTimestamp <= lastSyncTime) {
              continue;
            }
            const teksPesan =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              "";

            const isGambar = !!msg.message?.imageMessage;
            if (!teksPesan && !isGambar) continue;
            console.log(
              `\n📨 [INCOMING VAULT CHAT]: ${teksPesan || "[Foto Praktikum]"}`,
            );
            // Privacy Guardrail Check
            const cekSensitif = periksaKeamanan(teksPesan);
            if (cekSensitif.isSensitive) {
              console.log(
                `🔒 [PRIVACY GUARDRAIL TRIGGERED]: ${cekSensitif.alasan}`,
              );
              console.log(
                `⚠️ Pesan dibatalkan dari pengolahan AI Cloud demi keamanan data.`,
              );
              if (msg.key.id) {
                saveLastSyncedTimestamp(msgTimestamp, msg.key.id);
              }
              continue;
            }
            // 1. Olah Tautan (URL) jika ada
            const urls = ekstrakUrldariTeks(teksPesan);
            if (urls.length > 0) {
              for (const url of urls) {
                console.log(`🔗 Mengolah Link: ${url}`);
                const metadata = await ambilDataWeb(url);
                console.log(`📦 Result Extracted Link:`, metadata);
              }
            }
            // 2. Olah Gambar jika ada
            if (isGambar) {
              console.log(
                `📸 Mengolah Gambar/Screenshot via Gemini Vision & Menyimpan File...`,
              );
              const hasilGambar = await prosesEkstraksiGambar(msg, msg.key);
              console.log(`📦 Result Extracted Image:`, hasilGambar);
            }
            if (msg.key.id) {
              saveLastSyncedTimestamp(msgTimestamp, msg.key.id);
            }
          }
        });
        sockWA.ev.on("creds.update", saveCreds);

        sockWA.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log(
              "\n======================================================",
            );
            console.log(
              "SILAKAN SCAN QR CODE DI BAWAH DENGAN WHATSAPP HP KAMU:",
            );
            console.log(
              "======================================================\n",
            );
            qrcode.generate(qr, { small: true });
            console.log(
              "\n*Buka WA di HP -> Perangkat Tertaut (Linked Devices) -> Tautkan Perangkat*\n",
            );
          }

          if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(
              `⚠️ Koneksi WhatsApp terputus. Status Code: ${statusCode}. Reconnect: ${shouldReconnect}`,
            );

            if (shouldReconnect) {
              console.log("Mencoba menyambung kembali...");
              setTimeout(() => {
                hubungkan();
              }, 3000);
            } else {
              console.log(
                "❌ Sesi di-logout dari HP. Menghapus folder Wa_session...",
              );
              await fs.promises.rm(SESSION_DIR, {
                recursive: true,
                force: true,
              });
              sockWA = null;
              console.log("Sesi sudah dihapus.");
            }
          } else if (connection === "open") {
            console.log(
              "\n======================================================",
            );
            console.log("✅ WHATSAPP MIO BERHASIL TERHUBUNG & SESI TERSIMPAN!");
            console.log(
              "======================================================\n",
            );
            resolve(sockWA); // Resolusi Promise saat koneksi sukses terbuka
          }
        });
      } catch (error) {
        reject(error);
      }
    }
    hubungkan();
  });
}

export function dapatkanSocketWA() {
  return sockWA;
}
