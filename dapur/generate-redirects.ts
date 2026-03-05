import data from "./artikel.json"; // Bun bisa langsung import JSON!

const OUTPUT_FILE = "_redirects2";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function generateRedirects() {
  console.log("🛠️  Generating redirects for Bun...");

  const lines: string[] = ["# Redirects Relative Path Layar Kosong V6.9\n"];

  // Iterasi kategori dan artikel dari JSON
  for (const [category, articles] of Object.entries(data)) {
    const catSlug = slugify(category);

    for (const article of articles as string[][]) {
      // article[1] adalah nama file (misal: "belajar-linux.html")
      const fileName = article[1].trim();
      const fileSlug = fileName.replace(".html", "");

      const targetPath = `/${catSlug}/${fileSlug}`;

      // Path Lama 1: Tanpa .html
      lines.push(`/artikel/${fileSlug}  ${targetPath}  301`);

      // Path Lama 2: Dengan .html
      lines.push(`/artikel/${fileName}  ${targetPath}  301`);
    }
  }

  // Tulis file menggunakan Bun.write (sangat cepat)
  await Bun.write(OUTPUT_FILE, lines.join("\n"));

  console.log(`✅ Selesai! File ${OUTPUT_FILE} siap.`);
  console.log(`📊 Total baris: ${lines.length - 1}`);
}

generateRedirects().catch(console.error);