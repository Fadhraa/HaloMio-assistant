import makeWaSocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { prosesSimpanKeVault } from "./deduplicationService.js";
import { getLastSyncTime, saveLastSyncedTimestamp } from "./waSyncService.js";
import qrcode from "qrcode-terminal";
import { periksaKeamanan } from "./extractors/keamananPrivasi.js";
import {
  ekstrakUrldariTeks,
  ambilDataWeb,
} from "./extractors/linkEkstraktor.js";
import { prosesEkstraksiGambar } from "./extractors/imageEkstraktor.js";
import { logWA } from "./waLogger.js";
import pino from "pino";
import path from "path";
import fs from "fs";

const SESSION_DIR = path.join(process.cwd(), "Wa_session");
let sockWA = null;

/**
 * Menghapus pesan secara bersih dari layar obrolan tanpa meninggalkan jejak "Anda menghapus pesan ini"
 */
async function hapusPesanTanpaJejak(sock, msgKey, msgTimestamp, jid) {
  try {
    await sock.chatModify(
      {
        deleteForMe: {
          deleteMedia: true,
          key: msgKey,
          timestamp: msgTimestamp || Math.floor(Date.now() / 1000),
        },
      },
      jid,
    );
  } catch (err) {
    try {
      await sock.sendMessage(jid, { delete: msgKey });
    } catch (e) {}
  }
}

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
        const TARGET_GROUP_JID = process.env.GROUP_WA_ID;

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
            logWA.info(
              `📨 [INCOMING VAULT CHAT]: ${teksPesan || "[Foto Praktikum]"}`,
            );
            // Privacy Guardrail Check
            const cekSensitif = periksaKeamanan(teksPesan);
            if (cekSensitif.isSensitive) {
              logWA.warn(
                `🔒 [PRIVACY GUARDRAIL TRIGGERED]: ${cekSensitif.alasan}`,
              );
              logWA.warn(
                `Pesan dibatalkan dari pengolahan AI Cloud demi keamanan data.`,
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
                logWA.info(`🔗 Mengolah Link: ${url}`);
                const metadata = await ambilDataWeb(url);
                const hasilVault = prosesSimpanKeVault(metadata);
                let balasanWA = "";
                if (hasilVault.isDuplicate) {
                  const tglAwal = new Date(
                    hasilVault.item.created_at,
                  ).toLocaleDateString("id-ID");
                  balasanWA = `⚠️ *[DATA DUPLIKAT]*\nTautan ini sudah pernah kamu simpan pada ${tglAwal}.\n📌 Judul: ${hasilVault.item.judul}`;
                } else {
                  balasanWA = `✅ *[TERSIMPAN KE VAULT]*\n📌 *Kategori*: ${hasilVault.item.kategori.toUpperCase()}\n📌 *Judul*: ${hasilVault.item.judul}\n📝 ${hasilVault.item.ringkasan}`;
                }

                const pesanPeringatan = await sockWA.sendMessage(
                  msg.key.remoteJid,
                  { text: balasanWA },
                  { quoted: msg },
                );
                // Jika data duplikat, hapus pesan user dan notifikasi Mio setelah 5 detik
                if (hasilVault.isDuplicate) {
                  setTimeout(async () => {
                    try {
                      // Hapus pesan duplikat dari user tanpa jejak
                      await hapusPesanTanpaJejak(
                        sockWA,
                        msg.key,
                        msgTimestamp,
                        msg.key.remoteJid,
                      );
                      // Hapus notifikasi peringatan dari Mio tanpa jejak
                      if (pesanPeringatan?.key) {
                        await hapusPesanTanpaJejak(
                          sockWA,
                          pesanPeringatan.key,
                          Math.floor(Date.now() / 1000),
                          msg.key.remoteJid,
                        );
                      }
                      logWA.info(
                        "🧹 [AUTO-CLEANUP]: Pesan duplikat & peringatan telah dibersihkan bersih tanpa jejak!",
                      );
                    } catch (e) {
                      logWA.error("[ERROR AUTO-CLEANUP]:", e);
                    }
                  }, 5000);
                }
              }
            }
            // 2. Olah Gambar jika ada
            if (isGambar) {
              logWA.info(
                `📸 Mengolah Gambar/Screenshot via Gemini Vision & Menyimpan File...`,
              );
              const hasilGambar = await prosesEkstraksiGambar(msg, msg.key);
              if (hasilGambar) {
                // PROSES SIMPAN & DETEKSI DUPLIKASI
                const hasilVault = prosesSimpanKeVault(hasilGambar);

                let balasanWA = "";
                if (hasilVault.isDuplicate) {
                  const tglAwal = new Date(
                    hasilVault.item.created_at,
                  ).toLocaleDateString("id-ID");
                  balasanWA = `⚠️ *[DATA DUPLIKAT]*\nGambar/Screenshot ini sudah pernah kamu simpan pada ${tglAwal}. (Pesan ini akan dibersihkan dalam 5 detik)`;
                } else {
                  balasanWA = `✅ *[TERSIMPAN KE VAULT]*\n📌 *Kategori*: ${hasilVault.item.kategori.toUpperCase()}\n📌 *Judul*: ${hasilVault.item.judul}\n📝 ${hasilVault.item.ringkasan}`;
                }
                // Kirim Balasan (Quote Reply) di WhatsApp
                const pesanPeringatan = await sockWA.sendMessage(
                  msg.key.remoteJid,
                  { text: balasanWA },
                  { quoted: msg },
                );

                // Jika data duplikat, hapus pesan user dan notifikasi Mio setelah 5 detik
                if (hasilVault.isDuplicate) {
                  setTimeout(async () => {
                    try {
                      await hapusPesanTanpaJejak(
                        sockWA,
                        msg.key,
                        msgTimestamp,
                        msg.key.remoteJid,
                      );
                      if (pesanPeringatan?.key) {
                        await hapusPesanTanpaJejak(
                          sockWA,
                          pesanPeringatan.key,
                          Math.floor(Date.now() / 1000),
                          msg.key.remoteJid,
                        );
                      }
                      logWA.info(
                        "🧹 [AUTO-CLEANUP]: Foto duplikat & peringatan telah dibersihkan bersih tanpa jejak!",
                      );
                    } catch (e) {
                      logWA.error("[ERROR AUTO-CLEANUP]:", e);
                    }
                  }, 5000);
                }
              }
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
            logWA.info("QR Code generated for WhatsApp authentication.");
          }

          if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            logWA.warn(
              `Koneksi WhatsApp terputus. Status Code: ${statusCode}. Reconnect: ${shouldReconnect}`,
            );

            if (shouldReconnect) {
              logWA.info("Mencoba menyambung kembali ke WhatsApp...");
              setTimeout(() => {
                hubungkan();
              }, 3000);
            } else {
              logWA.error(
                "Sesi di-logout dari HP. Menghapus folder Wa_session...",
              );
              await fs.promises.rm(SESSION_DIR, {
                recursive: true,
                force: true,
              });
              sockWA = null;
              logWA.info("Sesi folder Wa_session sudah dihapus.");
            }
          } else if (connection === "open") {
            logWA.info("✅ WHATSAPP MIO BERHASIL TERHUBUNG & SESI TERSIMPAN!");
            resolve(sockWA); // Resolusi Promise saat koneksi sukses terbuka
          }
        });
      } catch (error) {
        logWA.error("Gagal menghubungkan ke WhatsApp:", error);
        reject(error);
      }
    }
    hubungkan();
  });
}

export function dapatkanSocketWA() {
  return sockWA;
}

