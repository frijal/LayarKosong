const path = require('path')
const fs = require('fs')

// Import modul enhancer
const injectMetadata = require('./inject-metadata')
const generateTOC = require('./generate-toc')

// Ambil argumen file (opsional)
const args = process.argv.slice(2)

// Fungsi untuk proses satu file
function enhanceFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File tidak ditemukan: ${filePath}`)
    return
  }
  injectMetadata(filePath)
  generateTOC(filePath)
}

// Jika ada argumen → proses file itu
if (args.length > 0) {
  args.forEach((file) => enhanceFile(file))
} else {
  // Kalau tidak ada argumen → scan folder artikel/
  fs.readdirSync('artikel')
    .filter((file) => file.endsWith('.html'))
    .forEach((file) => enhanceFile(path.join('artikel', file)))
}
try {
  // existing code
} catch (err) {
  console.error('❌ Enhancement failed:', err)
  process.exit(1)
}
