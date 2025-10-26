// ext/rss.js
import fs from 'fs/promises'
import path from 'path'
import { DOMParser } from '@xmldom/xmldom'
import { fileURLToPath } from 'url'

// --- Setup path ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const artikelJsonPath = path.join(__dirname, '../artikel.json')
const rssOutPath = path.join(__dirname, '../rss.xml')
const sitemapPath = path.join(__dirname, '../sitemap.xml')

// --- Konstanta indeks artikel.json ---
const IDX_TITLE = 0
const IDX_FILE = 1
const IDX_IMAGE = 2
const IDX_LASTMOD = 3
const IDX_DESCRIPTION = 4

// --- Helper Functions ---
function sanitizeTitle(raw) {
  if (!raw) return ''
  return raw.replace(/^\p{Emoji_Presentation}\s*/u, '').trimStart()
}

function getSitemapData(fileName, sitemapData) {
  const url = sitemapData[fileName]
  if (url) {
    return {
      lastmod: url.lastmod || new Date().toISOString(),
      image: url.imageLoc || '',
    }
  }
  return null
}

async function loadSitemapMap() {
  try {
    await fs.access(sitemapPath)
  } catch {
    return {}
  }

  const sitemapContent = await fs.readFile(sitemapPath, 'utf8')
  const doc = new DOMParser().parseFromString(sitemapContent, 'text/xml')
  const urls = doc.getElementsByTagName('url')
  const map = {}

  for (let i = 0; i < urls.length; i++) {
    const locElement = urls[i].getElementsByTagName('loc')[0]
    const lastmodElement = urls[i].getElementsByTagName('lastmod')[0]
    const imageLocElement = urls[i].getElementsByTagName('image:loc')[0]

    if (locElement) {
      const loc = locElement.textContent
      const fileName = path.basename(loc)
      map[fileName] = {
        lastmod: lastmodElement ? lastmodElement.textContent : null,
        imageLoc: imageLocElement ? imageLocElement.textContent : null,
      }
    }
  }

  return map
}

// --- Main Function ---
const generateRSS = async () => {
  try {
    // Pastikan artikel.json ada
    try {
      await fs.access(artikelJsonPath)
    } catch {
      console.error('❌ ERROR: File artikel.json tidak ditemukan.')
      process.exit(1)
    }

    const artikelData = JSON.parse(await fs.readFile(artikelJsonPath, 'utf8'))
    const sitemapMap = await loadSitemapMap()

    let allItems = []

    // Iterasi artikel
    for (const [category, articles] of Object.entries(artikelData)) {
      for (const arr of articles) {
        const fileName = arr[IDX_FILE]
        const sitemapInfo = getSitemapData(fileName, sitemapMap)

        if (sitemapInfo) {
          allItems.push({
            title: arr[IDX_TITLE],
            file: fileName,
            loc: `https://frijal.pages.dev/artikel/${fileName}`,
            pubDate: new Date(sitemapInfo.lastmod).toUTCString(),
            desc: arr[IDX_DESCRIPTION] || sanitizeTitle(arr[IDX_TITLE]),
            category: category,
            imageLoc: arr[IDX_IMAGE],
            dateObj: new Date(sitemapInfo.lastmod),
          })
        }
      }
    }

    // Sortir dan batasi
    allItems.sort((a, b) => b.dateObj - a.dateObj)
    const limit = parseInt(process.env.RSS_LIMIT || '30', 10)
    const itemsArr = allItems.slice(0, limit)

    // Generate RSS items
    const items = itemsArr
      .map((it) => {
        const enclosure = it.imageLoc
          ? `    <enclosure url="${it.imageLoc}" length="0" type="image/webp" />`
          : ''
        return `    <item>
      <title><![CDATA[${it.title}]]></title>
      <link><![CDATA[${it.loc}]]></link>
      <guid><![CDATA[${it.loc}]]></guid>
      <pubDate>${it.pubDate}</pubDate>
      <description><![CDATA[${it.desc}]]></description>
      <category><![CDATA[${it.category}]]></category>
${enclosure}
    </item>`
      })
      .join('\n')

    // Template RSS
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[Frijal Artikel]]></title>
    <link><![CDATA[https://frijal.pages.dev/]]></link>
    <description><![CDATA[Feed artikel terbaru]]></description>
    <language>id-ID</language>
    <atom:link href="https://frijal.pages.dev/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

    await fs.writeFile(rssOutPath, rss, 'utf8')
    console.log(
      `✅ rss.xml berhasil dibuat dari artikel.json (${itemsArr.length} item)`,
    )
  } catch (err) {
    console.error('❌ Terjadi error:', err)
  }
}

// --- Jalankan sekali saja ---
generateRSS()
