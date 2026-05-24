import speech_recognition as sr
import sys

def main():
    r = sr.Recognizer()
    m = sr.Microphone()

    # Kalibrasi awal untuk mengukur kebisingan ruangan (kipas laptop, dll)
    with m as source:
        r.adjust_for_ambient_noise(source, duration=1)
    
    # Memberi sinyal ke Node.js bahwa telinga sudah siap
    print("READY", flush=True) 

    # Looping tanpa henti untuk terus mendengarkan
    while True:
        with m as source:
            try:
                # Mendengarkan suara (timeout=1 agar tidak ngehang, batas kalimat=5 detik)
                audio = r.listen(source, timeout=1, phrase_time_limit=5)
                
                # Mengubah rekaman suara jadi teks (Bahasa Indonesia)
                teks = r.recognize_google(audio, language="id-ID").lower()
             
                
                # Cek kata kunci rahasia (Wake Word)
                # (Terkadang STT Google salah dengar "mio" jadi "neo" atau "mil", Anda bisa menambahkan variasinya nanti)
                if "halo mio" in teks: 
                    # Ambil perintah setelah kata "halo mio"
                    perintah = teks.split("halo mio")[-1].strip()
                    
                    if perintah:
                        # Print perintahnya agar BISA DIBACA oleh Node.js
                        print(f"PERINTAH:{perintah}", flush=True)
                    else:
                        print("DEBUG: Anda memanggil Mio, tapi tidak ada perintah", flush=True)
            except sr.WaitTimeoutError:
                pass # Abaikan jika ruangan sepi
            except sr.UnknownValueError:
                pass
                # Abaikan suara berisik yang bukan kata-kata
            except sr.RequestError:
                print("ERROR: Gagal menghubungi server pengenal suara", flush=True)
            except Exception:
                print("DEBUG: Terjadi error tak terduga", flush=True)

if __name__ == "__main__":
    main()
