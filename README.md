# 🚀 Panduan Membuat Static Site dengan Layar Kosong

Selamat datang! Panduan ini akan membantumu membangun situs statis yang super cepat dan ringan menggunakan *repository* **Layar Kosong**.

Konsepnya sederhana: Kita hanya menggunakan sekumpulan file HTML yang digabungkan, disimpan, lalu dipanggil menggunakan domain **GitHub Pages** (biasanya `usernamekamu.github.io`) atau domain kustom milikmu.

---

## 🛠️ Tahap 1: Persiapan Lingkungan (Install Git)

Langkah pertama yang paling krusial: **Pastikan Git CLI sudah terpasang**. Berikut cara instalasinya di berbagai Sistem Operasi:

### 🪟 Windows
Unduh dan instal *installer* resmi dari [git-scm.com](https://git-scm.com/download/win). Tinggal "Next, Next, Finish"!
atau bisa juga gunakan winget:
```bash
winget install --id Git.Git -e --source winget
```

### 🍎 macOS
Buka terminal dan ketik perintah berikut (jika menggunakan Homebrew):
```bash
brew install git
````

### 🐧 Linux

  * **Debian, Ubuntu, Linux Mint, MX Linux, Kali:**
    ```bash
    sudo apt update
    sudo apt install git
    ```
  * **Fedora, Red Hat (RHEL), CentOS, AlmaLinux:**
    ```bash
    sudo dnf install git
    # atau untuk versi lama:
    sudo yum install git
    ```
  * **Arch Linux, CachyOS, Manjaro, EndeavourOS:**
    ```bash
    sudo pacman -S git
    ```
  * **NixOS:**
    Tambahkan `git` ke `environment.systemPackages` di `configuration.nix` atau jalankan:
    ```bash
    nix-env -i git
    ```
  * **OpenSUSE:**
    ```bash
    sudo zypper install git
    ```

-----

## 🧬 Tahap 2: Setup Repository (Fork & Clone)

1.  **Punya Akun GitHub:** Pastikan kamu sudah login.
2.  **Fork Repository:** Lakukan *Fork* pada repository ini agar masuk ke akunmu. Pastikan mencentang opsi untuk menyertakan **seluruh branch** (termasuk branch `site`).
      * 👉 **[Klik di sini untuk Fork](https://github.com/frijal/LayarKosong/fork)**
3.  **Aktifkan Pages:** Setelah berhasil di-fork:
      * Masuk ke menu **Settings** \> **Pages**.
      * Pada bagian "Source", pilih **Deploy from a branch**.
      * Pilih branch `main` (atau `site` sesuai konfigurasi preferensimu) dan folder `/ (root)`.
      * Klik **Save**. Situsmu sekarang akan mulai dibangun\!

Repository kamu sekarang bisa diakses secara online di: `https://usernamekamu.github.io`

-----

## 🏗️ Tahap 3: Produksi (Membuat Konten)

Sekarang saatnya bersih-bersih dan mulai mengisi kontenmu sendiri.

### 1\. Bersihkan Konten Lama 🧹

Hapus semua file contoh bawaan agar situsmu bersih:

  * Hapus semua isi di dalam folder `artikel/`.
  * Hapus seluruh gambar di dalam folder `img/`.

### 2\. Aktifkan GitHub Actions ⚡

Secara *default*, fitur keamanan GitHub akan mematikan *Actions* pada repository hasil fork.

  * Masuk ke tab **Actions**.
  * Klik tombol hijau bertuliskan **"I understand my workflows, go ahead and enable them"**.

### 3\. Mulai Menulis (Workflow Otomatis) ✍️

Di sinilah keajaiban terjadi. Kamu tidak menaruh file langsung di folder publik, tapi melalui proses "masak" otomatis:

1.  Buat file HTML artikel barumu.
2.  Masukkan file tersebut ke dalam folder **`artikelx/`** (perhatikan akhiran 'x').
3.  Lakukan *commit* dan *push*.
4.  **Biarkan Action Bekerja:** Sistem otomatis (*workflow*) akan mendeteksi file baru, memprosesnya, dan memindahkannya dari `artikelx/` menuju folder `artikel/` yang siap tayang.

🎉 **Selesai\!** Halaman pertamamu sudah terbit. Ulangi langkah ini untuk artikel-artikel berikutnya.

-----

## 🎨 Tahap 4: Personalisasi & Konfigurasi

Setelah uji coba sukses, saatnya mengklaim situs ini menjadi milikmu sepenuhnya. Jangan lupa ubah data-data berikut agar SEO dan identitas situsmu benar.

### 📂 Folder `ext/`

Sesuaikan URL dan nama domain pada seluruh file konfigurasi di dalam folder ini.

### 📄 isi File di dalam Root (Wajib Diubah)

Edit dan sesuaikan informasi di file-file berikut yang ada di halaman utama (*root*):

- `404.html` - Halaman untuk tautan URL yang tidak ditemukan.
- `BingSiteAuth.xml` - Verifikasi Bing Webmaster.
- `CODE_OF_CONDUCT.md` - Kode etik repository.
- `data-deletion-form.html` - Form penghapusan data.
- `data-deletion.html` - Halaman penghapusan data.
- `disclaimer.html` - Disclaimer situs.
- `disclaimer.md` - Disclaimer (markdown).
- `favicon.ico` / `favicon.png` / `favicon.svg` - Icon situs.
- `feed.html` - Halaman RSS Feed Terbaru.
- `img.html` - Galeri gambar.
- `index.html` - Halaman utama.
- `robots.txt` - Instruksi untuk crawler.
- `search.html` - Halaman pencarian.
- `sitemap.html` - Daftar Isi, Peta Situs .
- `thumbnail.jpg` / `thumbnail.png` / `thumbnail.webp` - Thumbnail sosial media.

### 🙏 Checklist Konfigurasi

- [ ] Ganti semua URL dari `dalam.web.id` ke domain kamu.
- [ ] Update informasi kontak dan metadata.
- [ ] Sesuaikan warna, logo, dan branding.
- [ ] Test semua link internal.
- [ ] Verifikasi sitemap dan robots.txt

-----

## Domain Custom (Opsional jika Ada)

Jika ingin menggunakan domain custom:

1. Tambahkan file `CNAME` di root repository.
2. Isi dengan nama domain kamu (contoh: `example.com`)
3. Atur DNS di provider domain kamu:
   - Tambahkan record A ke IP GitHub Pages.
   - Atau CNAME ke `usernamekamu.github.io`

-----

## 💬 Butuh Bantuan?

Ada kendala saat instalasi atau *workflow* macet? Jangan panik\! Langsung saja meluncur ke repository aslinya, kita ngobrol santai di sana.

👉 **[Diskusi di Repository LayarKosong](https://github.com/frijal/LayarKosong/discussions)**

-----

## Lisensi

Silakan cek file [Lisensi](LICENSE) di repository untuk informasi lisensi.

## Kontributor

Terima kasih untuk semua yang telah berkontribusi pada halaman ini. 🙏

---

<details>
<summary>⚡ Klik untuk Status Teknis ⚙️</summary>

### 📊 Status:

[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue?logo=open-source-initiative&logoColor=white)](#Unlicense)
[![Public Domain](https://img.shields.io/badge/Public%20Domain-Yes-orange?logo=creative-commons&logoColor=white)](#readme)
[![Free 100%](https://img.shields.io/badge/Free-100%25-brightgreen?logo=opensourceinitiative&logoColor=white)](#readme)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-blue?logo=github&logoColor=white)](#readme)
[![Website](https://img.shields.io/badge/Website-Live-2ea44f?logo=google-chrome&logoColor=white)](https://frijal.pages.dev)
[![HTTPS Enabled](https://img.shields.io/badge/HTTPS-Enabled-blue?logo=letsencrypt&logoColor=white)](#readme)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Yes-blue?logo=github&logoColor=white)](#readme)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-Available-34A853?logo=googledrive&logoColor=white)](#readme)
[![Release Continuous](https://img.shields.io/badge/Release-Continuous-orange?logo=github&logoColor=white)](#readme)
[![Last Commit](https://img.shields.io/github/last-commit/frijal/frijal.github.io?logo=github&logoColor=white)](#readme)

**Otomatisasi & CI/CD:**

[![🔄 Proses ArtikelX](https://github.com/frijal/LayarKosong/actions/workflows/proses-artikelx.yml/badge.svg?branch=main)](https://github.com/frijal/LayarKosong/actions/workflows/proses-artikelx.yml)
[![☢️ Build and Generate Site Files](https://github.com/frijal/LayarKosong/actions/workflows/generate-json-xml.yml/badge.svg)](https://github.com/frijal/LayarKosong/actions/workflows/generate-json-xml.yml)
[![⚠️ Copy ke Branch Site Cloudflare](https://github.com/frijal/LayarKosong/actions/workflows/copybranch.yml/badge.svg?branch=main)](https://github.com/frijal/LayarKosong/actions/workflows/copybranch.yml)
[![IndexNow Daily Submit](https://github.com/frijal/LayarKosong/actions/workflows/indexnow.yml/badge.svg)](https://github.com/frijal/LayarKosong/actions/workflows/indexnow.yml)
[![Ping Feeds & Sitemap](https://github.com/frijal/LayarKosong/actions/workflows/rssping.yml/badge.svg)](https://github.com/frijal/LayarKosong/actions/workflows/rssping.yml)
[![🔆 Pengecekan & Laporan Konten Harian](https://github.com/frijal/LayarKosong/actions/workflows/hapushitung.yml/badge.svg)](https://github.com/frijal/LayarKosong/actions/workflows/hapushitung.yml)

[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Yes-2088FF?logo=githubactions&logoColor=white)](#readme)
[![GitHub Bot](https://img.shields.io/badge/GitHub%20Bot-Active-blue?logo=github&logoColor=white)](#readme)
[![GitHub Cron](https://img.shields.io/badge/GitHub%20Cron-Scheduled-2f363d?logo=github&logoColor=white)](#readme)
[![Action User](https://img.shields.io/badge/Action%20User-Yes-orange?logo=github&logoColor=white)](#readme)
[![Codespaces](https://img.shields.io/badge/Codespaces-Ready-2f363d?logo=github&logoColor=white)](#readme)

**Stack:**

[![HTML5](https://img.shields.io/badge/HTML5-Yes-orange?logo=html5&logoColor=white)](#readme)
[![CSS3](https://img.shields.io/badge/CSS3-Yes-blue?logo=css3&logoColor=white)](#readme)
[![JavaScript](https://img.shields.io/badge/JavaScript-Yes-yellow?logo=javascript&logoColor=black)](#readme)
[![Node.js](https://img.shields.io/badge/Node.js-Yes-339933?logo=node.js&logoColor=white)](#readme)
[![npm](https://img.shields.io/badge/npm-Yes-CB3837?logo=npm&logoColor=white)](#readme)
[![pnpm](https://img.shields.io/badge/pnpm-Yes-F69220?logo=pnpm&logoColor=white)](#readme)
[![pipx](https://img.shields.io/badge/pipx-Yes-3776AB?logo=python&logoColor=white)](#readme)

**Format Data:**

[![Markdown](https://img.shields.io/badge/Markdown-Yes-000000?logo=markdown&logoColor=white)](#readme)
[![YAML](https://img.shields.io/badge/YAML-Yes-6f9eaf?logo=yaml&logoColor=white)](#readme)
[![JSON](https://img.shields.io/badge/JSON-Yes-000000?logo=json&logoColor=white)](#readme)
[![XML](https://img.shields.io/badge/XML-Yes-orange?logo=w3c&logoColor=white)](#readme)

**Sosial Media:**

[![Twitter/X](https://img.shields.io/badge/Twitter-frijal-000000?logo=x&logoColor=white)](https://twitter.com/frijal)
[![Threads](https://img.shields.io/badge/Threads-frijal-000000?logo=threads&logoColor=white)](https://www.threads.net/@frijal)
[![TikTok](https://img.shields.io/badge/TikTok-@gibah.dilarang-000000?logo=tiktok&logoColor=white)](https://www.tiktok.com/@gibah.dilarang)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-frijal-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/frijal)
[![Facebook](https://img.shields.io/badge/Facebook-frijal-1877F2?logo=facebook&logoColor=white)](https://facebook.com/frijal)
[![Instagram](https://img.shields.io/badge/Instagram-frijal-E4405F?logo=instagram&logoColor=white)](https://instagram.com/frijal)
[![Gist](https://img.shields.io/badge/Gist-Available-black?logo=github&logoColor=white)](https://gist.github.com/frijal)

**Dukungan AI:**

[![Gemini](https://img.shields.io/badge/Gemini-Yes-blueviolet?logo=google&logoColor=white)](#readme)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-Yes-blue?logo=openai&logoColor=white)](#readme)
[![Copilot](https://img.shields.io/badge/Copilot-Yes-purple?logo=github&logoColor=white)](#readme)

</details>
