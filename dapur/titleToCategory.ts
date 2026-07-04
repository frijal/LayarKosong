// -------------------------------------------------------
// FILE: titleToCategory.ts
// -------------------------------------------------------
interface Category {
  name: string;
  keywords: string[];
}

const categories: Category[] = [
  {
    name: "Sistem Terbuka",
    keywords: [
      "linux", "ubuntu", "debian", "arch", "fedora", "Clonezilla", "Kubuntu", "Synaptic", "cachyos", "mx-linux", "nixos", "opensuse", "slackware", "zorin", "garuda", "Lubuntu", "blankon", "Mandrake", "mageia", "parrot", "apt", "pacman", "paru", "aur", "dpkg", "yum", "dnf", "OpenMandriva", "flatpak", "snap", "brew", "Perl", "Solaris", "gnome", "kde", "xfce", "hyprland", "wayland", "x11", "compiz", "kernel", "systemd", "grub", "btrfs", "ext4", "chroot", "root", "sudo", "bash", "zsh", "fish", "nano", "vim", "CentOS", "foss", "open source", "oss", "distro", "desktop", "repo", "mirror", "ventoy", "rescuezilla", "rsync", "tar", "shell", "dotfiles", "lts", "glibc"
    ]
  },
  {
    name: "Olah Media",
    keywords: [
      "ffmpeg", "handbrake", "excel", "imagemagick", "Visual","Editor", "libreoffice", "ghostscript", "pdftk", "gimp", "inkscape", "video", "audio", "mp4", "mkv", "mp3", "ogg", "webp", "png", "svg", "edit", "convert", "compress", "resize", "crop", "split", "gabung", "Viewer", "watermark", "subtitle", "srt", "transcribe", "ocr", "metadata", "exif", "batch", "rekam", "screencast", "thumbnail", "framerate", "bitrate", "codec", "h264", "h265", "av1"
    ]
  },
  {
    name: "Jejak Sejarah",
    keywords: [
      "nabi", "rasul", "sahabat", "khalifah", "sejarah","Al-Qur'an", "kisah", "islam", "muhammadiyah", "sirah", "madinah", "mekkah", "hijrah", "badar", "uhud", "khandaq", "yarmuk", "hittin", "shalahuddin", "fatih", "muhammad", "ayat", "ibrahim", "iman", "muslim", "musa", "isa", "nuh", "yunus", "perang", "penaklukan", "kekhalifahan", "daulah", "utsmaniyah", "abbasiyah", "andalusia", "baghdad", "cordoba", "jerusalem", "baitul hikmah"
    ]
  },
  {
    name: "Gaya Hidup",
    keywords: [
      "kesehatan", "pencernaan", "tidur", "diet", "Sajadah","koperasi", "herbal", "obat", "sakit", "kopi", "minuman", "makanan", "resep", "kurma", "susu", "camilan", "motor", "mobil", "ojol", "touring", "wisata", "traveling", "hotel", "hobi", "gaya hidup", "bahagia", "mental", "stres", "olahraga", "anak", "bahaya", "listrik"
    ]
  },
  {
    name: "Opini Sosial",
    keywords: [
      "politik", "pemerintah", "korupsi", "demokrasi", "Bangsa","pemilu", "lagu", "presiden", "balikpapan", "mbg", "guru honorer", "pendidikan", "ekonomi", "publik", "negara", "fakta", "indonesia", "umkm", "pajak", "subsidi", "kebijakan", "kritik", "opini", "sosial", "masyarakat", "keadilan", "koruptor", "integritas", "rakyat", "sekolah", "pemimpin", "bisnis"
    ]
  },
  {
    name: "Warta Tekno",
    keywords: [
      "ai", "chatgpt", "gemini", "claude", "ISO","microsoft", "USB", "internet", "llm", "server", "deep learning", "prompt", "online", "github", "git", "programming", "javascript", "python", "html", "css", "markdown", "workflow", "github actions", "api", "backend", "json", "frontend", "fullstack", "windows", "android", "browser", "firefox", "chrome", "laptop", "hardware", "ssd", "ram", "vram", "zram", "cpu", "gpu", "wifi", "cloudflare", "security", "phishing", "encryption", "privacy", "backup", "ssh", "digital", "kalkulator", "js", "layar", "generator", "modern"
    ]
  }
];

// --- FUNGSI UTILITAS REGEX ---
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- OPTIMASI TINGKAT DEWA: Kompilasi 1 Regex Raksasa per Kategori ---
const compiledCategories = categories.map(cat => {
  const pattern = cat.keywords.map(escapeRegExp).join('|');
  return {
    name: cat.name,
    regex: new RegExp(`\\b(${pattern})\\b`, 'i')
  };
});

// --- FUNGSI UTAMA KLASIFIKASI ---
export function titleToCategory(title: string): string {
  if (!title || typeof title !== 'string') return "Lainnya";

  // Karena regex sudah di-compile di awal, pencarian di dalam loop akan sangat ringan
  const found = compiledCategories.find(cat => cat.regex.test(title));

  return found ? found.name : "Lainnya";
}