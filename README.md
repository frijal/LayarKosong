# Panduan Membuat Static Site dengan LayarKosong

Panduan lengkap untuk membuat static site menggunakan repository [LayarKosong](https://github.com/frijal/LayarKosong.git). Static site ini menggunakan sekumpulan file HTML yang digabungkan dan disimpan, lalu dipanggil menggunakan nama domain .Github.IO dari GitHub atau domain custom milikmu sendiri.

## Persiapan Awal

### 1. Instalasi Git CLI

Pastikan sudah memasang aplikasi paket git-cli pada komputer atau laptop kamu. Berikut cara instalasinya untuk berbagai sistem operasi:

#### Windows
```bash
# Download installer dari https://git-scm.com/download/win
# Atau gunakan winget
winget install --id Git.Git -e --source winget
```

#### macOS
```bash
# Menggunakan Homebrew
brew install git

# Atau download installer dari https://git-scm.com/download/mac
```

#### Linux

**Red Hat / CentOS**
```bash
sudo yum install git
```

**Fedora**
```bash
sudo dnf install git
```

**Debian / Ubuntu / Linux Mint / MX Linux**
```bash
sudo apt update
sudo apt install git
```

**Arch Linux / CachyOS**
```bash
sudo pacman -S git
```

**NixOS**
```nix
# Tambahkan ke configuration.nix
environment.systemPackages = with pkgs; [
  git
];

# Atau gunakan nix-shell
nix-shell -p git
```

### 2. Fork Repository

Pastikan kamu sudah punya akun GitHub, lalu lakukan Fork repository ini dengan lengkap, termasuk cabang branch yang bernama **"site"**:

🔗 [Fork LayarKosong Repository](https://github.com/frijal/LayarKosong/fork)

### 3. Aktifkan GitHub Pages

Setelah melakukan fork, ubah repository kamu menjadi Pages agar dapat diakses secara publik dan online:

1. Masuk ke **Settings** repository kamu
2. Pilih menu **Pages** di sidebar
3. Pilih branch **site** sebagai source
4. Klik **Save**

Repository kamu sekarang bisa diakses di: `https://usernamekamu.github.io`

---

## Tahap Produksi

### 1. Persiapan Konten

Bersihkan konten default dari repository:

- **Hapus** semua isi dari folder `artikel/`
- **Hapus** seluruh gambar dari dalam folder `img/`

### 2. Aktifkan GitHub Actions

Secara otomatis, fitur Actions dan perintah workflow `.YAML` akan dimatikan pada repository hasil fork. Aktifkan kembali:

1. Masuk ke tab **Actions** di repository kamu
2. Klik tombol hijau **"I understand my workflows, go ahead and enable them"**
3. Aktifkan semua workflow yang tersedia

### 3. Upload Konten Pertama

1. Masukkan file HTML baru ke dalam folder `artikelx/`
2. Commit dan push perubahan ke GitHub

### 4. Biarkan Automation Bekerja

Action akan bekerja secara otomatis untuk:
- Memindahkan file HTML dari folder `artikelx/` ke folder `artikel/`
- Memproses dan mempublikasikan halaman

### 5. Verifikasi Publikasi

Setelah proses selesai, halaman pertama kamu telah terbit! Kamu bisa lanjutkan dengan artikel berikutnya menggunakan cara yang sama.

---

## Konfigurasi dan Penyesuaian

Setelah berhasil testing dengan 1 file HTML, silakan lakukan penyesuaian property sesuai kebutuhan kamu:

### File yang Perlu Disesuaikan

Ubah nama domain dan alamat URL pada seluruh file konfigurasi di folder `ext/` dan file-file berikut:

- `BingSiteAuth.xml` - Verifikasi Bing Webmaster
- `CODE_OF_CONDUCT.md` - Kode etik repository
- `data-deletion-form.html` - Form penghapusan data
- `data-deletion.html` - Halaman penghapusan data
- `disclaimer.html` - Disclaimer situs
- `disclaimer.md` - Disclaimer (markdown)
- `favicon.ico` / `favicon.png` / `favicon.svg` - Icon situs
- `feed.html` - RSS feed
- `img.html` - Galeri gambar
- `index.html` - Halaman utama
- `robots.txt` - Instruksi untuk crawler
- `search.html` - Halaman pencarian
- `sitemap.html` - Peta situs
- `thumbnail.jpg` / `thumbnail.png` / `thumbnail.webp` - Thumbnail sosial media

### Checklist Konfigurasi

- [ ] Ganti semua URL dari `dalam.web.id` ke domain kamu
- [ ] Update informasi kontak dan metadata
- [ ] Sesuaikan warna, logo, dan branding
- [ ] Test semua link internal
- [ ] Verifikasi sitemap dan robots.txt

---

## Domain Custom (Opsional)

Jika ingin menggunakan domain custom:

1. Tambahkan file `CNAME` di root repository
2. Isi dengan nama domain kamu (contoh: `example.com`)
3. Atur DNS di provider domain kamu:
   - Tambahkan record A ke IP GitHub Pages
   - Atau CNAME ke `username.github.io`

---

## Butuh Bantuan?

Kalau ada kendala atau pertanyaan, jangan ragu untuk:

💬 **Diskusi di GitHub**: [LayarKosong Discussions](https://github.com/frijal/LayarKosong/discussions)

Mari kita ngobrol dan selesaikan bareng-bareng! 🚀

---

## Lisensi

Silakan cek file `LICENSE` di repository untuk informasi lisensi.

## Kontributor

Terima kasih untuk semua yang telah berkontribusi pada proyek ini! 🙏

---

<details>
<summary>⚡ Klik untuk Status Teknis ⚙️</summary>

### 📊 Status:

[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue?logo=open-source-initiative&logoColor=white)](#readme)
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
