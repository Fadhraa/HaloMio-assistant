const readline = require('readline');
const { bukaBrowser } = require('./functions/buka_browser');

// Membuat interface untuk membaca input dari terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("=========================================");
console.log("🤖 Halo! Saya adalah Asisten Bot Sederhana Anda.");
console.log("Ketik 'buka [sesuatu]' untuk membuka browser.");
console.log("Ketik 'exit' untuk keluar.");
console.log("=========================================\n");

function tanyaBot() {
    rl.question('Anda: ', (input) => {
        const text = input.trim().toLowerCase();

        // Jika perintah adalah exit atau keluar
        if (text === 'exit' || text === 'keluar') {
            console.log('🤖 Bot: Sampai jumpa! Semoga harimu menyenangkan.');
            rl.close();
            return;
        }

        // Jika perintah diawali dengan kata "buka "
        if (text.startsWith('buka ')) {
            // Mengambil teks setelah kata "buka "
            const query = text.substring(5).trim();
            bukaBrowser(query);
        } else {
            console.log("🤖 Bot: Maaf, saya belum mengerti perintah itu. Coba ketik 'buka youtube' atau 'buka github.com'");
        }

        // Looping agar bot terus bertanya sampai diketik exit
        tanyaBot();
    });
}

// Mulai interaksi pertama
tanyaBot();
