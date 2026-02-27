const categories = [
  {
    name: "Sistem Terbuka",
    keywords: [
      "apt", "arch", "aur", "bash", "blankon", "bootable", "bsd", "btrfs", "cachyos", "chroot", "compiz", "conky", "cooling", "debian", "desktop", "distro", "dotfiles", "dpkg", "ext4", "fedora", "flatpak", "floorp", "foss", "garuda", "glibc", "gnome", "grub", "hyprland", "kde", "kernel", "komunitas", "kpli", "linux", "lts", "mageia", "mirror", "mx-linux", "nano", "nixos", "open source", "opensuse", "oss", "pacman", "partition", "paru", "perl", "repo", "rescuezilla", "rev", "root", "rsync", "sebarubuntu", "shell", "slackware", "snap", "solaris", "sudo", "systemd", "tar", "ubuntu", "ubuntu party", "usb", "ventoy", "vim", "wayland", "xfce", "yum", "zorin", "zsync"
    ]
  },
{
  name: "Olah Media",
  keywords: [
    "audio", "av1", "batch-rename", "bitrate", "canvas", "codec", "compress", "convert", "deoldify", "dpi", "durasi", "exif", "excel", "ffmpeg", "film", "format", "foto", "framerate", "gabung", "gambar", "ghostscript", "gimp", "grayscale", "h264", "h265", "handbrake", "imagemagick", "iptv", "kompres", "layers", "libreoffice", "metadata", "mewarnai", "mkv", "mp3", "mp4", "multimedia", "ocr", "ogg", "openoffice", "pdftk", "png", "potong", "preset", "rekam", "recursive", "resize", "scan", "split", "spreadsheet", "srt", "subtitle", "svg", "transcribe", "vector", "video", "vlc", "watermark", "webp", "ffmpeg"
  ]
},
{
  name: "Jejak Sejarah",
  keywords: [
    "adab", "akidah", "al-andalus", "andalusia", "aqidah", "ayub", "baghdad", "bahtera", "baitul-hikmah", "barqa", "bilal", "daulah", "doa", "fatih", "fatwa", "fiqh", "fitnah", "ghibah", "hadis", "haki", "halal", "haram", "hijab", "hijrah", "hijriyah", "hittin", "hukum", "ibnu batutah", "ikhlas", "imam", "iman", "islam", "istighfar", "isra", "janji", "jumat", "khalifah", "khwarizmi", "madinah", "madyan", "masjid", "masyitoh", "maulid", "mesir", "muamalah", "muhammadiyah", "mukjizat", "murad", "musa", "mushaf", "muslim", "nabi", "nuh", "pahlawan", "penaklukan", "perjanjian", "persia", "pertempuran", "piagam", "quran", "qunut", "ramadhan", "risalah", "sabar", "saf", "sahabat", "salam", "salman", "sejarah", "seljuk", "shalat", "shalahuddin", "sirah", "sombong", "sunnah", "surga", "syariat", "tabayun", "tabi'in", "tabut", "tauhid", "tawadhu", "uhud", "umar", "utsman", "utsmaniyah", "yaqub", "yarmuk", "yerusalem", "yusuf", "zaid"
  ]
},
{
  name: "Gaya Hidup",
  keywords: [
    "angkringan", "arabica", "bahagia", "bali", "bandara", "bekapai", "berkendara", "boker", "camilan", "detox", "diet", "e-bpkb", "gaul", "gaya hidup", "gejala", "gerimis", "herbal", "hobi", "hotel", "jagung", "jajanan", "jogja", "kafein", "kesehatan", "kopi", "kerupuk", "kuliner", "kurma", "laundry", "lifestyle", "metode", "minuman", "motor", "ngopi", "niat", "nutrisi", "obat", "ojol", "parkir", "pecel", "pencernaan", "pijat", "psikotes", "resep", "respiro", "robusta", "sakit", "seduh", "sembelit", "service", "sikat", "sparepart", "staycation", "susu", "tidur", "touring", "unboxing", "vixion", "wanita", "wisata"
  ]
},
{
  name: "Opini Sosial",
  keywords: [
    "aci", "adaro", "amanah", "audit", "bisnis", "budaya", "bukalapak", "catatan", "cpns", "cuti", "duit", "ekonomi", "ekspedisi", "etika", "fenomena", "golput", "grobogan", "harian", "hormat", "ibu", "indonesia", "integritas", "iwan fals", "jatos", "jne", "kasih", "kebijakan", "kejujuran", "kepemimpinan", "kerja", "kinerja", "kolom", "kopdar", "korporasi", "kota", "kreativitas", "kritik", "masyarakat", "nostalgia", "opini", "organisasi", "pajak", "pemerintah", "penjilat", "perencanaan", "perjalanan", "perusahaan", "poac", "politik", "ppdb", "produktifitas", "pt", "rencana", "renungan", "sktm", "sosial", "subsidi", "uang", "ujian nasional", "umkm", "viral", "whoosh"
  ]
},
{
  name: "Warta Tekno",
  keywords: [
    "ai", "amd", "android", "api", "automation", "backend", "baterai", "benchmarking", "blogspot", "bootloader", "branch", "browser", "build", "facebook", "canva", "chatgpt", "claude", "cleanup", "cloudflare", "codespaces", "cpu", "curl", "cyber-security", "deep-learning", "dns", "domain", "drive", "encryption", "endpoint", "eula", "firefox", "frontend", "fullstack", "gadget", "gemini", "git", "github", "gitignore", "gorilla glass", "grammarly", "hardware", "hdd", "head", "header", "hosting", "html", "iot", "javascript", "jasper", "jaringan", "json", "js", "kate", "keyring", "laptop", "learning", "lisensi", "llm", "markdown", "meta", "mic", "microsoft exchange", "notion", "npm", "optimasi", "osborne1", "overclock", "pdf", "phishing", "internet", "piracy", "powerbank", "prompt", "pwa", "push", "quickbooks", "refresh", "robots.txt", "samba", "schema", "security", "shutdown", "software", "ssh", "ssh3", "ssd", "ssl", "static site", "sturnus", "tema", "thermal-paste", "thunderbird", "tidio", "tools", "trojan", "virtualbox", "vivaldi", "web", "website", "wifi", "windows", "winget", "wine", "workflow", "yaml", "yml", "foss", "microsoft"
  ]
}
];

export function titleToCategory(title) {
  const t = title.toLowerCase();
  const found = categories.find(cat =>
    cat.keywords.some(k => t.includes(k))
  );
  return found ? found.name : "Lainnya";
}
