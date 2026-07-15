Buatkan kode HTML, CSS, dan JavaScript (dalam satu file HTML) untuk halaman depan blog **"Layar Kosong"** dengan tata letak 2 kolom dan gaya situs berita modern. Perhatikan spesifikasi berikut secara detail:

**1. Top Bar**  
- Warna latar putih (atau sesuai tema) dengan bayangan tipis.  
- Di sebelah kiri: logo `favicon.svg` (gunakan placeholder SVG sederhana) dan nama situs **"Layar Kosong"** dengan font tebal.  
- Di tengah: **4 tombol pillbutton** (misal: `Beranda`, `Populer`, `Terbaru`, `Kategori`) dengan latar transparan dan border tipis, efek hover berubah warna.  
- Di sebelah kanan: kolom pencarian dengan input teks dan tombol **clear ❌** yang muncul saat ada teks; di sampingnya terdapat **dropdown tahun** dan **dropdown bulan** (gunakan `<select>` atau custom dropdown).  

**2. Body – 2 Kolom**  
- **Kolom kiri (utama) – lebar 70% pada layar besar**  
  - **Hero Slide** di bagian atas:  
    - Carousel otomatis (geser setiap 5 detik) yang menampilkan **7 slide**, masing-masing mewakili satu kategori.  
    - Setiap slide menampilkan thumbnail artikel (gambar placeholder), judul besar, dan deskripsi singkat.  
    - Gunakan data dummy untuk 7 artikel (satu per kategori), yang akan menjadi unggulan.  
  - **7 Baris Kategori** di bawah hero:  
    - Setiap baris memiliki judul kategori (h2) dan di dalamnya terdapat **2 kolom artikel** (lebar 50% masing-masing) yang menampilkan artikel terbaru dari kategori tersebut.  
    - Artikel yang sudah tampil di hero **tidak** diulang di baris kategori.  
    - Setiap kartu artikel menampilkan thumbnail kecil, judul, dan tanggal terbit.  
    - Gunakan data dummy untuk setiap kategori (minimal 2 artikel per kategori, kecuali kategori yang artikelnya dipakai hero – maka sisanya 2 artikel berbeda).  

- **Kolom kanan – Sidebar – lebar 30% pada layar besar**  
  - Berisi **10 thumbnail artikel acak** dari seluruh kategori.  
  - Masing-masing menampilkan gambar thumbnail persegi, judul (1 baris), dan nama kategori.  
  - Beri judul "Artikel Acak" di atas daftar.

**3. Footer – Full width, 2 kolom**  
- Kolom kiri: **link ikon media sosial** (Facebook, Twitter, Instagram, YouTube) menggunakan ikon Font Awesome.  
- Kolom kanan: **link teks internal** (misal: Tentang Kami, Kontak, Privasi, Disclaimer).  
- Latar footer gelap (#1a1a1a) dengan teks putih, rapi.

**4. Aspek Teknis & Tema**  
- **Full width pada semua perangkat**:  
  - Pastikan halaman menggunakan **full width secara default** pada setiap mode tampilan (desktop maupun mobile).  
  - Tidak ada batasan `max-width` pada kontainer utama (gunakan `max-width: none` atau `100%`).  
  - Gunakan `padding` yang proporsional (misal 15–20px di sisi kiri/kanan) agar konten tidak menempel ke tepi layar, tetapi tetap memanfaatkan seluruh lebar layar.  
- **Mobile-first**: Gunakan pendekatan CSS yang mendesain untuk layar kecil terlebih dahulu (misal: satu kolom), lalu dengan media queries `min-width` untuk layar lebih besar (≥768px menjadi dua kolom).  
- **Tema terang/gelap (Light/Dark)**:  
  - Gunakan CSS custom properties (variabel) untuk semua warna (latarbelakang, teks, border, dll).  
  - Tema gelap diaktifkan dengan menambahkan kelas `.dark` pada elemen `<html>`.  
  - Sediakan tombol toggle di top bar untuk mengalihkan tema secara manual.  
  - **Dukungan prefers-color-scheme**: Gunakan media query `@media (prefers-color-scheme: dark)` untuk secara otomatis mengaktifkan tema gelap sesuai pengaturan sistem pengguna.  
  - Pastikan transisi warna halus saat berganti tema.  
- Semua data artikel dan kategori menggunakan **array objek JavaScript** di dalam `<script>` agar mudah diganti nanti.  
- Gunakan **CSS Grid** atau **Flexbox** untuk tata letak responsif.  
- Hero carousel dibuat dengan JavaScript murni (tanpa library eksternal).  
- Semua gambar menggunakan placeholder dari `https://picsum.photos/seed/{seed}/800/400` untuk hero dan `https://picsum.photos/seed/{seed}/400/300` untuk thumbnail.  
- Sertakan Font Awesome untuk ikon.  
- Berikan kode yang bersih, terstruktur, dan mudah dipahami.

Hasil akhir adalah satu file HTML lengkap yang dapat langsung dibuka di browser.
