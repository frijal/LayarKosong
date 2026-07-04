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
      "linux", "ubuntu", "debian", "arch", "fedora", "cachyos", "mx-linux", "nixos", "opensuse", "slackware", "zorin", "garuda", "blankon", "mageia", "parrot",
      "apt", "pacman", "paru", "aur", "dpkg", "yum", "dnf", "flatpak", "snap", "brew",
      "gnome", "kde", "xfce", "hyprland", "wayland", "x11", "compiz",
      "kernel", "systemd", "grub", "btrfs", "ext4", "chroot", "root", "sudo", "bash", "zsh", "fish", "nano", "vim",
      "foss", "open source", "oss", "distro", "desktop", "repo", "mirror", "ventoy", "rescuezilla", "rsync", "tar", "shell", "dotfiles", "lts", "glibc"
    ]
  },
{
  name: "Olah Media",
  keywords: [
    "ffmpeg", "handbrake", "imagemagick", "ghostscript", "pdftk", "gimp", "inkscape",
    "video", "audio", "mp4", "mkv", "mp3", "ogg", "webp", "png", "svg",
    "edit", "convert", "compress", "resize", "crop", "split", "gabung", "watermark",
    "subtitle", "srt", "transcribe", "ocr", "metadata", "exif",
    "batch", "rekam", "screencast", "thumbnail", "framerate", "bitrate", "codec", "h264", "h265", "av1"
  ]
},
{
  name: "Jejak Sejarah",
  keywords: [
    "nabi", "rasul", "sahabat", "khalifah", "sejarah", "islam", "muhammadiyah", "sirah",
    "madinah", "mekkah", "hijrah", "badar", "uhud", "khandaq", "yarmuk", "hittin",
    "shalahuddin", "fatih", "muhammad", "ibrahim", "musa", "isa", "nuh", "yunus",
    "perang", "penaklukan", "kekhalifahan", "daulah", "utsmaniyah", "abbasiyah",
    "andalusia", "baghdad", "cordoba", "jerusalem", "baitul hikmah"
  ]
},
{
  name: "Gaya Hidup",
  keywords: [
    "kesehatan", "pencernaan", "tidur", "diet", "herbal", "obat", "sakit",
    "kopi", "minuman", "makanan", "resep", "kurma", "susu", "camilan",
    "motor", "mobil", "ojol", "touring", "wisata", "traveling", "hotel",
    "hobi", "gaya hidup", "bahagia", "mental", "stres", "olahraga"
  ]
},
{
  name: "Opini Sosial",
  keywords: [
    "politik", "pemerintah", "korupsi", "demokrasi", "pemilu", "presiden",
    "mbg", "guru honorer", "pendidikan", "ekonomi", "indonesia",
    "umkm", "pajak", "subsidi", "kebijakan", "kritik", "opini",
    "sosial", "masyarakat", "keadilan", "koruptor", "integritas"
  ]
},
{
  name: "Warta Tekno",
  keywords: [
    "ai", "chatgpt", "gemini", "claude", "llm", "deep learning", "prompt",
    "github", "git", "programming", "javascript", "python", "html", "css", "markdown",
    "workflow", "github actions", "api", "backend", "frontend", "fullstack",
    "windows", "android", "browser", "firefox", "chrome", "laptop", "hardware",
    "ssd", "ram", "vram", "zram", "cpu", "gpu", "wifi", "cloudflare",
    "security", "phishing", "encryption", "privacy", "backup", "ssh"
  ]
}
];

// --- OPTIMASI: Compile Regex di awal, BUKAN di dalam loop ---
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Kita ubah array keyword menjadi SATU regex raksasa per kategori.
// Contoh: \b(linux|ubuntu|debian|...)\b
const compiledCategories = categories.map(cat => {
  // Gabungkan semua keyword dengan karakter OR (|)
  const pattern = cat.keywords.map(escapeRegExp).join('|');
  return {
    name: cat.name,
    regex: new RegExp(`\\b(${pattern})\\b`, 'i')
  };
});

export function titleToCategory(title: string): string {
  if (!title || typeof title !== 'string') return "Lainnya";

  // Karena regex sudah jadi (compiledCategories), pencarian akan kilat!
  const found = compiledCategories.find(cat => cat.regex.test(title));

  return found ? found.name : "Lainnya";
}
