import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const ARTIKEL_DIR = path.join(ROOT, 'artikelx')
const IMG_BASE = 'https://dalam.web.id/img'

/**
 * Aman dari circular reference
 */
const fixImage = (obj, img, seen = new Set()) => {
  if (!obj || typeof obj !== 'object') return
    if (seen.has(obj)) return
      seen.add(obj)

      if (
        !obj.image ||
        obj.image === '' ||
        (Array.isArray(obj.image) && obj.image.length === 0)
      ) {
        obj.image = img
      }

      for (const v of Object.values(obj)) {
        fixImage(v, img, seen)
      }
}

const processFile = async (file) => {
  const filePath = path.join(ARTIKEL_DIR, file)
  let html = await fs.readFile(filePath, 'utf8')

  const baseName = path.basename(file, '.html')
  const img = `${IMG_BASE}/${baseName}.webp`

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const altText = titleMatch?.[1]?.trim() || baseName

  // 1️⃣ JSON-LD
  html = html.replace(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
                      (full, jsonText) => {
                        try {
                          const data = JSON.parse(jsonText)
                          Array.isArray(data)
                          ? data.forEach((o) => fixImage(o, img))
                          : fixImage(data, img)
                          return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
                        } catch {
                          return full
                        }
                      }
  )

  // 2️⃣ Meta tags
  const meta = []

  if (!/property=["']og:image/i.test(html))
    meta.push(`<meta property="og:image" content="${img}">`)
    if (!/property=["']og:image:alt/i.test(html))
      meta.push(`<meta property="og:image:alt" content="${altText}">`)
      if (!/name=["']twitter:card/i.test(html))
        meta.push(`<meta name="twitter:card" content="summary_large_image">`)
        if (!/name=["']twitter:image/i.test(html))
          meta.push(`<meta name="twitter:image" content="${img}">`)
          if (!/itemprop=["']image["']/i.test(html))
            meta.push(`<meta itemprop="image" content="${img}">`)

            if (meta.length) {
              html = html.replace(/<\/head>/i, `  ${meta.join('\n  ')}\n</head>`)
            }

            await fs.writeFile(filePath, html, 'utf8')
            console.log(`✔ fixed: ${file}`)
}

const main = async () => {
  console.log('🔧 CI Meta Image Fixer started')

  try {
    const stat = await fs.stat(ARTIKEL_DIR)
    if (!stat.isDirectory()) throw new Error()
  } catch {
    console.error(`❌ Folder tidak ditemukan: ${ARTIKEL_DIR}`)
    process.exit(1)
  }

  const files = (await fs.readdir(ARTIKEL_DIR))
  .filter((f) => f.endsWith('.html'))

  if (!files.length) {
    console.log('ℹ️ Tidak ada file HTML untuk diproses')
    return
  }

  for (const f of files) {
    await processFile(f)
  }

  console.log(`✅ Selesai memproses ${files.length} file`)
}

main().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
