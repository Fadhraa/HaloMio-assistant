const { exec } = require('child_process');
const pintasanWeb = {
    "youtube": "https://www.youtube.com",
    "yt": "https://www.youtube.com",
    "netflix": "https://www.netflix.com",
    "github": "https://github.com",
    "whatsapp": "https://web.whatsapp.com",
    "wa": "https://web.whatsapp.com",
    "chatgpt": "https://chatgpt.com",
    "google": "https://www.google.com"
};
function bukaBrowser(query) {
    let url;
    const katakunci = query.toLowerCase();
    if (pintasanWeb[katakunci]) {
        url = pintasanWeb[katakunci]
    } else if (query.includes('.') && !query.includes(' ')) {
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
