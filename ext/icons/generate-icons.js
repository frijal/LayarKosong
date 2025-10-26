// ext/generate-icons.mjs
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

// Lokasi file master & output
const master = 'favicon.svg'
const outputDir = 'icons'
const manifestFile = 'site.webmanifest'

// Daftar ukuran ikon standar PWA
const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024]

// Ukuran khusus untuk iOS
const appleSize = 180

// Pastikan folder ext/icons ada
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (err) {
    console.error('Gagal membuat folder:', err)
  }
}

async function generateAll() {
  await ensureDir(outputDir)

  // Generate semua ikon PWA
  const generateIcons = sizes.map(async (size) => {
    const out = path.join(outputDir, `icon-${size}x${size}.png`)
    await sharp(master).resize(size, size).toFile(out)
    console.log(`✔ icon-${size}x${size}.png dibuat`)
  })

  // Generate apple-touch-icon
  const appleIconPath = path.join(outputDir, `apple-touch-icon-${appleSize}x${appleSize}.png`)
  const generateAppleIcon = sharp(master)
    .resize(appleSize, appleSize)
    .toFile(appleIconPath)
    .then(() => console.log(`🍏 apple-touch-icon-${appleSize}x${appleSize}.png dibuat`))

  await Promise.all([...generateIcons, generateAppleIcon])

  // Buat manifest
  const icons = sizes.map((size) => ({
    src: `${outputDir}/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
  }))

  const manifest = {
    name: 'Frijal Artikel',
    short_name: 'Frijal',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons,
  }

  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2))
  console.log(`✅ ${manifestFile} berhasil dibuat/diupdate\n`)

  console.log('Tambahkan di <head> HTML untuk iOS:')
  console.log(
    `<link rel="apple-touch-icon" sizes="${appleSize}x${appleSize}" href="/${outputDir}/apple-icon-${appleSize}x${appleSize}.png">`
  )
}

generateAll().catch((err) => console.error(err))

