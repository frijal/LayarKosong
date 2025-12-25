import fs from 'fs/promises'
import path from 'path'

const folder = 'artikelx'
const baseUrl = 'https://dalam.web.id'

// validasi kasar image Discover
const isDiscoverFriendly = (url) =>
  typeof url === 'string' &&
  /maxresdefault|1200|1280|1600|1920|w1200|w1280/i.test(url) &&
  !/favicon|icon|logo/i.test(url)

// ambil image dari meta head (prioritas)
const getMetaImage = (html) => {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ]

  for (const p of patterns) {
    const m = html.match(p)
    if (m && isDiscoverFriendly(m[1])) {
      return m[1].trim()
    }
  }
  return null
}

const processFiles = async () => {
  try {
    const files = await fs.readdir(folder)

    for (const f of files) {
      if (!f.endsWith('.html')) continue

      const filePath = path.join(folder, f)
      let html = await fs.readFile(filePath, 'utf8')

      const baseName = path.basename(f, '.html')
      const fallbackImage = `${baseUrl}/img/${baseName}.webp`

      const metaImage = getMetaImage(html)
      const finalImage = metaImage || fallbackImage

      // Ambil title untuk alt text
      const title =
        html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() || baseName

      // 1️⃣ Perbaiki JSON-LD (HANYA Article)
      html = html.replace(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
        (match, jsonText) => {
          try {
            const data = JSON.parse(jsonText)

            const apply = (obj) => {
              if (!obj || typeof obj !== 'object') return
              if (obj['@type'] !== 'Article') return

              if (
                obj.image &&
                ((Array.isArray(obj.image) && obj.image.length) ||
                  (typeof obj.image === 'string' && obj.image.trim()))
              ) {
                return
              }

              obj.image = finalImage
            }

            Array.isArray(data) ? data.forEach(apply) : apply(data)

            return `<script type="application/ld+json">${JSON.stringify(
              data,
            )}</script>`
          } catch {
            return match
          }
        },
      )

      // 2️⃣ Tambahkan meta image JIKA BELUM ADA
      const metaTags = []

      if (!/<meta[^>]+property=["']og:image["']/i.test(html))
        metaTags.push(`<meta property="og:image" content="${finalImage}">`)

      if (!/<meta[^>]+property=["']og:image:alt["']/i.test(html))
        metaTags.push(
          `<meta property="og:image:alt" content="${title}">`,
        )

      if (!/<meta[^>]+name=["']twitter:card["']/i.test(html))
        metaTags.push(
          `<meta name="twitter:card" content="summary_large_image">`,
        )

      if (!/<meta[^>]+name=["']twitter:image["']/i.test(html))
        metaTags.push(
          `<meta name="twitter:image" content="${finalImage}">`,
        )

      if (!/<meta[^>]+itemprop=["']image["']/i.test(html))
        metaTags.push(
          `<meta itemprop="image" content="${finalImage}">`,
        )

      if (metaTags.length) {
        html = html.replace(
          /<\/head>/i,
          `${metaTags.join('\n  ')}\n</head>`,
        )
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
