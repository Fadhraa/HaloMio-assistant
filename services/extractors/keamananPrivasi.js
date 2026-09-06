const KATA_KUNCI_SENSITIF = [
  "password",
  "kata sandi",
  "pin bank",
  "otp",
  "token auth",
  "nomor rekening",
  "no rekening",
  "kartu kredit",
  "cvv",
  "ktp",
  "nik",
];

const REGEX_PII = /\b\d{16}\b|\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/i;

export function periksaKeamanan(teks) {
  if (!teks) return { isSensitive: false, alasan: null };

  const lowerTeks = teks.toLowerCase();
  //   kata kunci
  const kata_kunci = KATA_KUNCI_SENSITIF.some((kunci) =>
    lowerTeks.includes(kunci),
  );
  if (kata_kunci) {
    return {
      isSensitive: true,
      alasan: "Mengandung kata kunci sensitif",
    };
  }

  // pola nomor kartu kredit
  const cocokNoKartu = teks.match(REGEX_PII);
  if (cocokNoKartu) {
    return {
      isSensitive: true,
      alasan: "Terdeteksi pola nomor identitas/kartu 16-digit (PII)",
    };
  }

  return {
    isSensitive: false,
    alasan: null,
  };
}
