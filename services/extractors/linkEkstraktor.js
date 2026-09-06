const REGEX_URL = /(https?:\/\/[^\s]+)/g;

export function ekstrakUrldariTeks(teks) {
  if (!teks) return [];

  const matches = teks.match(REGEX_URL);
  return matches ? matches : [];
}

export async function ambilDataWeb(url) {
  try {
    const controller = new AbortController();
    const timeOut = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeOut);
    const html = await response.text();
    const matchTitle =
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      ) || html.match(/<title>([^<]+)<\/title>/i);
    const matchDesc =
      html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      );
    const judul = matchTitle ? matchTitle[1].trim() : "Tautan Web";
    const deskripsi = matchDesc ? matchDesc[1].trim() : "Tidak ada deskripsi.";
    let kategori = "referensi";
    if (url.includes("instagram.com")) kategori = "lomba";
    else if (url.includes("canva.com")) kategori = "canva";
    else if (url.includes("drive.google.com")) kategori = "dokumen";
    else {
      kategori = "lainnya";
    }
    return {
      judul,
      deskripsi,
      kategori,
      url,
    };
  } catch (e) {
    console.error(e);
    return {
      url,
      judul: "Tautan Web",
      deskripsi: "Gagal mengambil metadata web.",
      kategori: "referensi",
    };
  }
}
