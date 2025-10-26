// ext/generate-icons.js
const sharp = require('sharp')
const fs = require('fs')

const master = 'ext/icon-master.svg' // master SVG
const outputDir = 'ext/icons' // folder output ikon
const manifestFile = 'site.webmanifest'

// Daftar ukuran ikon standar PWA
const sizes = [48, 72, 96, 128, 192, 256, 384, 512, 1024]

// Ukuran khusus untuk iOS
const appleSize = 180

// Pastikan folder ext/icons ada
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Generate semua ikon PWA
const generateIcons = sizes.map((size) =>
  sharp(master)
    .resize(size, size)
    .toFile(`${outputDir}/icon-${size}x${size}.png`)
    .then(() => console.log(`✔ icon-${size}x${size}.png dibuat`)),
)

// Generate apple-touch-icon
const generateAppleIcon = sharp(master)
  .resize(appleSize, appleSize)
  .toFile(`${outputDir}/apple-icon-${appleSize}x${appleSize}.png`)
  .then(() => console.log(`🍏 apple-icon-${appleSize}x${appleSize}.png dibuat`))

Promise.all([...generateIcons, generateAppleIcon])
  .then(() => {
    // Buat entri icons untuk manifest
    const icons = sizes.map((size) => ({
      src: `${outputDir}/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
    }))

    // Template manifest dasar
    const manifest = {
      name: 'Frijal Artikel',
      short_name: 'Frijal',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#0f172a',
      icons,
    }

    // Tulis ke site.webmanifest
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))
    console.log(`✅ ${manifestFile} berhasil dibuat/diupdate`)

    console.log('\nTambahkan di <head> HTML untuk iOS:')
    console.log(
      `<link rel="apple-touch-icon" sizes="${appleSize}x${appleSize}" href="/${outputDir}/apple-icon-${appleSize}x${appleSize}.png">`,
    )
  })
  .catch((err) => console.error(err))
