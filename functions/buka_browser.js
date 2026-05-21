const { exec } = require('child_process');

function bukaBrowser(query) {
    // Jika query terlihat seperti URL (contoh: google.com), tambahkan https://
    // Jika tidak, anggap itu sebagai pencarian Google.
    let url;
    if (query.includes('.') && !query.includes(' ')) {
        url = query.startsWith('http') ? query : `https://${query}`;
    } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    console.log(`🤖 Bot: Sedang membuka browser untuk: ${query}...`);
    
    // Command 'start' digunakan di Windows untuk membuka URL di browser default
    exec(`start "" "${url}"`, (error) => {
        if (error) {
            console.error(`🤖 Bot: Maaf, gagal membuka browser. Error: ${error.message}`);
        }
    });
}

module.exports = { bukaBrowser };
