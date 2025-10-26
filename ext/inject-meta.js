import fs from 'fs/promises'
import path from 'path'

const folder = 'artikelx'

// Fungsi rekursif untuk memperbaiki JSON-LD
const fixImage = (obj, img) => {
  if (!obj || typeof obj !== 'object') return
  if (
    !obj.image ||
    obj.image === '' ||
    (Array.isArray(obj.image) && obj.image.length === 0)
  ) {
    obj.image = img
  }
  Object.values(obj).forEach((v) => fixImage(v, img))
}

const processFiles = async () => {
  try {
    const files = await fs.readdir(folder)

    for (const f of files) {
      if (!f.endsWith('.html')) continue

      const filePath = path.join(folder, f)
      let html = await fs.readFile(filePath, 'utf8')

      const baseName = path.basename(f, '.html')
      const img = `https://frijal.pages.dev/img/${baseName}.webp`

      // Ambil <title> sebagai fallback alt
      const titleMatch = html.match(/<title>(.*?)<\/title>/i)
      const altText = titleMatch ? titleMatch[1].trim() : baseName

      // 1️⃣ Perbaiki JSON-LD
      html = html.replace(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
        (match, jsonText) => {
          try {
            const data = JSON.parse(jsonText)
            Array.isArray(data)
              ? data.forEach((o) => fixImage(o, img))
              : fixImage(data, img)
            return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
          } catch {
            return match // biarkan jika parsing gagal
          }
        },
      )

      // 2️⃣ Siapkan meta tags baru jika belum ada
      const metaTags = []

      if (!/<meta[^>]+property=["']og:image/i.test(html))
        metaTags.push(`<meta property="og:image" content="${img}">`)
      if (!/<meta[^>]+property=["']og:image:alt/i.test(html))
        metaTags.push(`<meta property="og:image:alt" content="${altText}">`)
      if (!/<meta[^>]+name=["']twitter:card/i.test(html))
        metaTags.push(
          `<meta name="twitter:card" content="summary_large_image">`,
        )
      if (!/<meta[^>]+name=["']twitter:image/i.test(html))
        metaTags.push(`<meta name="twitter:image" content="${img}">`)
      if (!/<meta[^>]+itemprop=["']image["']/i.test(html))
        metaTags.push(`<meta itemprop="image" content="${img}">`)

      if (metaTags.length) {
        html = html.replace(/<\/head>/i, `${metaTags.join('\n  ')}\n</head>`)
      }

      await fs.writeFile(filePath, html, 'utf8')
      console.log('✔ Diproses:', f)
    }

    console.log('✅ Semua file selesai diproses!')
  } catch (err) {
    console.error('❌ Terjadi error:', err)
  }
}

processFiles()
