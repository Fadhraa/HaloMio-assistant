import "dotenv/config";
import readline from "readline";
import { spawn } from "child_process";
import { jalankanMio } from "./agent.js";
import { mulaiServer } from "./server.js";
import { koneksiKeWA } from "./services/waService.js";

function MioCli() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async function prosesWithAi(text) {
    if (!text) return;

    const promptUser = text.toLowerCase();
    if (
      promptUser.includes("exit") ||
      promptUser.includes("berhenti") ||
      promptUser.includes("matikan program")
    ) {
      console.log(`Mio: Sampai jumpa, Fadhra!`);
      process.exit(0);
    }

    try {
      const jawaban = await jalankanMio(text);

      // Membersihkan baris saat ini di terminal dan menampilkan output Mio
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log("Mio: ", jawaban);
    } catch (error) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log("Mio: Maaf, sepertinya ada kesalahan.");
      console.error("[DEBUG ERROR]:", error);
    }
  }

  function tanyaAi(inputSuara = null) {
    if (inputSuara) {
      console.log(`${inputSuara}`);
      prosesWithAi(inputSuara)
        .then(() => {
          tanyaAi();
        })
        .catch((error) => {
          console.log("Mio: Maaf, sepertinya ada kesalahan.");
          tanyaAi();
        });
    } else {
      rl.question("Fadhra: ", async (text) => {
        await prosesWithAi(text);
        tanyaAi();
      });
    }
  }

  const telinga = spawn("python", ["telinga.py"]);
  telinga.stdout.on("data", async (data) => {
    const barisData = data.toString().split("\n");
    for (let hasilSuara of barisData) {
      hasilSuara = hasilSuara.trim();
      if (!hasilSuara) continue;
      if (hasilSuara === "READY") {
        console.log("Mio: halo Fadhra!");
        tanyaAi();
        continue;
      }

      if (hasilSuara.startsWith("DEBUG:")) {
        console.log(`🦻 ${hasilSuara}`);
        continue;
      }

      if (hasilSuara.startsWith("PERINTAH:")) {
        const perintahAsli = hasilSuara.replace("PERINTAH:", "").trim();
        tanyaAi(perintahAsli);
        continue;
      }

      console.log(`🦻 RAW: ${hasilSuara}`);
    }
  });

  telinga.stderr.on("data", (data) => {
    console.error(`[Mic Error]: ${data}`);
  });

  const pelacak = spawn("node", ["track.js"], { cwd: "../tracking" });
}
async function main() {
  try {
    console.log("⏳ Memulai Web Server Mio di background...");
    mulaiServer(3000);
    console.log("⏳ Menghubungkan ke WhatsApp...");
    await koneksiKeWA();

    console.log("🚀 Memulai antarmuka CLI Agent...\n");
    MioCli();
  } catch (error) {
    console.error("[ERROR BOOTSTRAP SYSTEM]:", error);
  }
}
main();
