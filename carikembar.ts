import { glob } from "glob";

// Ambil semua file dengan berbagai ekstensi
const allFiles = await glob("**/*.{py,ts,js,sh}", {
  ignore: ["node_modules/**", "dist/**", "artikel/**", "ext/**", "sementara/**", "artikelx/**", "dapur/XXX/**", ".git/**"]
});

const groups = allFiles.reduce((acc, file) => {
  const fileName = file.split('/').pop() || "";

  // Pisahkan berdasarkan dash, underscore, atau titik
  const parts = fileName.split(/[-_.]/);

  // Logika: Ambil kata kedua sebagai KEY grup
  // Contoh: 'audit-seo.ts' -> 'seo', 'cek_gambar.py' -> 'gambar'
  const key = parts.length > 2 ? parts[1].toUpperCase() : "SINGLE_WORD";

  if (!acc[key]) acc[key] = [];
  acc[key].push(file);
  return acc;
}, {} as Record<string, string[]>);

console.log("🚀 Mencari kembaran lintas ekstensi...");

// Tampilkan hasil pengelompokan
Object.entries(groups).forEach(([key, files]) => {
  // Hanya tampilkan grup yang punya lebih dari satu file
  // atau grup yang kita curigai punya kembaran lintas bahasa
  if (files.length > 1 || key !== "SINGLE_WORD") {
    console.log(`\n📦 Group: ${key}`);

    // Sort agar file dengan nama mirip berdekatan
    files.sort().forEach(f => {
      const ext = f.split('.').pop();
      const icon = ext === 'py' ? '🐍' : ext === 'ts' ? '🟦' : ext === 'js' ? '🟨' : '🐚';
      console.log(`   ${icon} ${f}`);
    });
  }
});
