// titleToCategory.js
const categories = [
  {
  name: "🐧 Linux & Open Source",
  keywords: [
  "apt", "arch", "aur", "blankon", "bootable", "bsd", "cachyos", "chroot", "compiz", "conky", "cooling", "debian", "desktop", "distro", "dpkg", "fedora", "foss", "garuda", "gnome", "grub", "kde", "kernel", "komunitas", "kpli", "linux", "lts", "mageia", "mirror", "mx-linux", "nixos", "open source", "opensuse", "oss", "pacman", "paru", "perl", "repo", "rescuezilla", "rsync", "sebarubuntu", "slackware", "solaris", "tar", "ubuntu", "ubuntu party", "usb", "ventoy", "xfce", "yum", "zorin", "zsync"
  ]
},
  {
  name: "📸 Multimedia & Editing",
  keywords: [
  "audio", "codec", "convert", "deoldify", "durasi", "ffmpeg", "film", "format", "foto", "gabung", "libreoffice", "openoffice", "gambar", "ghostscript", "gimp", "handbrake", "imagemagick", "iptv", "kompres", "mewarnai", "mp3", "multimedia", "spreadsheet", "excel", "ogg", "pdf", "pdftk", "potong", "preset", "rekam", "resize", "scan", "split", "video", "vlc", "watermark", "webp"
  ]
},
  {
    name: "📚 Sejarah & Religi",
    keywords: [
    "adab", "akidah", "andalusia", "aqidah", "baghdad", "bahtera", "barqa", "bilal", "doa", "fatih", "fiqh", "fitnah", "ghibah", "hadis", "haki", "halal", "haram", "hijab", "hijrah", "hijriyah", "hittin", "hukum", "ibnu batutah", "iman", "imam", "islam", "istighfar", "janji", "jumat", "khwarizmi", "madinah", "masjid", "masyitoh", "maulid", "mesir", "muhammadiyah", "mukjizat", "murad", "musa", "muslim", "mushaf", "nabi", "nuh", "pahlawan", "penaklukan", "perjanjian", "pertempuran", "persia", "piagam", "quran", "qunut", "ramadhan", "risalah", "sabar", "saf", "sahabat", "salam", "salman", "sejarah", "seljuk", "shalat", "shalahuddin", "syariat", "sombong", "sunnah", "surga", "tabut", "tabayun", "tauhid", "uhud", "umar", "utsman", "utsmaniyah", "yarmuk", "yerusalem", "zaid"
    ]
  },
  {
    name: "🍜 Kuliner, Gaya Hidup & Kesehatan",
    keywords: [
    "angkringan", "bahagia", "bali", "bandara", "bekapai", "berkendara", "boker", "camilan", "gaya hidup", "gerimis", "hotel", "jagung", "jogja", "kesehatan", "kopi", "kerupuk", "kuliner", "kurma", "laundry", "metode", "minuman", "motor", "niat", "ngopi", "obat", "ojol", "pecel", "pencernaan", "pijat", "psikotes", "respiro", "sakit", "sembelit", "sikat", "susu", "tidur", "touring", "unboxing", "wanita", "wisata"
    ]
  },
  {
    name: "📢 Catatan & Opini Sosial",
    keywords: [
    "aci", "adaro", "artikel", "bisnis", "bukalapak", "catatan", "cpns", "cuti", "duit", "ekspedisi", "fenomena", "foss kaltim", "golput", "grobogan", "harian", "ibu", "indonesia", "iwan fals", "jatos", "jne", "kasih", "kejujuran", "kerja", "kota", "kopdar", "kreativitas", "nostalgia", "opini", "organisasi", "peradaban", "perencanaan", "perusahaan", "perjalanan", "poac", "ppdb", "produktifitas", "pt", "rencana", "renungan", "sktm", "sosial", "uang", "ujian nasional"
    ]
  },
  {
    name: "🖥️ Teknologi Web, AI & Umum",
    keywords: [
    "ai", "amd", "baterai", "wine", "bootloader", "branch", "browser", "build", "canva", "chatgpt", "claude", "cleanup", "cli", "codespaces", "cpu", "curl", "eula", "gemini", "git", "github", "gorilla glass", "grammarly", "hdd", "head", "header", "html", "jasper", "jaringan", "javascript", "js", "keyring", "laptop", "learning", "lisensi", "meta", "mic", "notion", "npm", "optimasi", "osborne1", "phishing", "piracy", "push", "quickbooks", "refresh", "robots.txt", "samba", "shutdown", "software", "ssh", "ssd", "terminal", "tidio", "tools", "virtualbox", "web", "wifi", "windows", "winget", "workflow", "yml", "yaml"
    ]
  }
];

export function titleToCategory(title) {
  const t = title.toLowerCase();
  const found = categories.find(cat =>
    cat.keywords.some(k => t.includes(k))
  );
  return found ? found.name : "🔆 Lainnya";
}
