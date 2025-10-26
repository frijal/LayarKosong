// ext/screenshot.js
import { chromium } from 'playwright'

async function takeScreenshot(url, outputPath) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })

  try {
    const response = await page.goto(url, { waitUntil: 'load' })

    if (response && response.status() !== 200) {
      console.error(`[ERROR] Gagal memuat ${url}. Status: ${response.status()}`)
      await browser.close()
      return 1
    }

    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 90 })
    console.log(`[SUCCESS] Screenshot disimpan sebagai ${outputPath}`)
  } catch (error) {
    console.error(
      `[FATAL] Gagal mengambil screenshot untuk ${url}: ${error.message}`,
    )
    return 1
  } finally {
    await browser.close()
  }
  return 0
}

// Ambil argumen dari command line
const url = process.argv[2]
const outputPath = process.argv[3]

takeScreenshot(url, outputPath).then((exitCode) => process.exit(exitCode))
