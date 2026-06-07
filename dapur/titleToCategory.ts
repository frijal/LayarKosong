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
      // Distro & OS
      "linux", "ubuntu", "debian", "arch", "fedora", "cachyos", "mx-linux", "nixos", "opensuse", "slackware", "zorin", "garuda", "blankon", "mageia", "parrot",
      // Package Manager & Tools
      "apt", "pacman", "paru", "aur", "dpkg", "yum", "dnf", "flatpak", "snap", "brew",
      // Desktop Environment & WM
      "gnome", "kde", "xfce", "hyprland", "wayland", "x11", "compiz",
      // Kernel & System
      "kernel", "systemd", "grub", "btrfs", "ext4", "chroot", "root", "sudo", "bash", "zsh", "fish", "nano", "vim",
      // Lainnya
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
      "ojol", "mbg", "guru honorer", "pendidikan", "kesehatan", "ekonomi",
      "umkm", "pajak", "subsidi", "kebijakan", "kritik", "opini",
      "sosial", "masyarakat", "keadilan", "koruptor", "integritas"
    ]
  },
  {
    name: "Warta Tekno",
    keywords: [
      // AI & Modern Tech
      "ai", "chatgpt", "gemini", "claude", "llm", "deep learning", "prompt",
      // Programming & Development
      "github", "git", "programming", "javascript", "python", "html", "css", "markdown",
      "workflow", "github actions", "api", "backend", "frontend", "fullstack",
      // Hardware & Software
      "windows", "android", "browser", "firefox", "chrome", "laptop", "hardware",
      "ssd", "ram", "vram", "zram", "cpu", "gpu", "wifi", "cloudflare",
      // Security & Tools
      "security", "phishing", "encryption", "privacy", "backup", "ssh"
    ]
  }
];

/**
 * Helper untuk mencegah error karakter khusus pada RegEx
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function titleToCategory(title: string): string {
  if (!title || typeof title !== 'string') return "Lainnya";

  const found = categories.find(cat =>
    cat.keywords.some(keyword => {
      const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
      return regex.test(title);
    })
  );

  return found ? found.name : "Lainnya";
}
