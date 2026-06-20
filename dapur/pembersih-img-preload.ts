import { Glob } from "bun";

// Pola Regex untuk kedua format
const patterns = [
  /<link\s+[^>]*href=["']?[^" >]+["']?\s+fetchpriority=high\s+as=image\s+rel=preload[^>]*>/gi,
  /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["'][^"']*["']\s+fetchpriority=["']high["'][^>]*>/gi
];

// Scan folder induk (..) agar bisa menjangkau file di root
const glob = new Glob("../**/*.html"); 
let totalFilesCleaned = 0;

console.log("🚀 Memulai pembersihan dari folder dapur/...");

for await (const file of glob.scan(".")) { 
  // Karena kita scan dari "../", path yang didapat juga relatif terhadap folder dapur
  const handle = Bun.file(file); 
  let content = await handle.text();
  let originalContent = content;

  for (const pattern of patterns) {
    content = content.replace(pattern, "");
  }

  if (content !== originalContent) {
    await Bun.write(file, content);
    console.log(`✅ Dibersihkan: ${file}`);
    totalFilesCleaned++;
  }
}

console.log(`\n🎉 Selesai! ${totalFilesCleaned} file telah dibersihkan.`);
