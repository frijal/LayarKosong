/**
 * Inisialisasi Marquee Dinamis dengan mendeteksi kategori berdasarkan nama file artikel.
 * @param {string} targetCategoryId ID elemen div Marquee (e.g., 'related-marquee-container')
 * @param {string} currentFilename Nama file artikel yang sedang dibuka (e.g., '1011nabi-yaakub-yusuf.html')
 * @param {string} jsonPath Jalur file artikel.json (e.g., '/artikel.json')
 */
async function initCategoryMarquee(
  targetCategoryId,
  currentFilename,
  jsonPath,
) {
  const marqueeContainer = document.getElementById(targetCategoryId)

  if (!marqueeContainer) {
    console.error(
      `Marquee Error: Elemen dengan ID: ${targetCategoryId} tidak ditemukan.`,
    )
    return
  }

  marqueeContainer.innerHTML = `<p style="margin:0; text-align:center; color: #aaa; font-style: italic;">Memuat artikel terkait...</p>`

  try {
    const response = await fetch(jsonPath)
    if (!response.ok) {
      throw new Error(`Gagal memuat ${jsonPath} (Status: ${response.status})`)
    }
    const data = await response.json()

    let targetCategory = null
    let allArticles = []

    // 1. Lakukan Iterasi untuk Mencari Kategori Berdasarkan Filename
    for (const categoryName in data) {
      if (data.hasOwnProperty(categoryName)) {
        // Mencari di array artikel (indeks 1 adalah nama file)
        const articleMatch = data[categoryName].find(
          (item) => item[1] === currentFilename,
        )

        if (articleMatch) {
          targetCategory = categoryName
          // Ambil semua artikel dari kategori yang cocok
          allArticles = data[categoryName]
          break // Kategori ditemukan, hentikan perulangan
        }
      }
    }

    if (!targetCategory || allArticles.length === 0) {
      marqueeContainer.innerHTML = ''
      console.warn(
        `Marquee: Kategori untuk file ${currentFilename} tidak ditemukan di JSON.`,
      )
      return
    }

    // 2. Filter artikel saat ini dari daftar related posts (opsional)
    const filteredArticles = allArticles.filter(
      (item) => item[1] !== currentFilename,
    )

    if (filteredArticles.length === 0) {
      marqueeContainer.innerHTML = ''
      return
    }

    // 3. Acak Urutan Artikel
    filteredArticles.sort(() => 0.5 - Math.random())

    // 4. Bangun Konten HTML Marquee
    let contentHTML = ''
    const separator = ' • '

    filteredArticles.forEach((post) => {
      const title = post[0]
      const url = `/artikel/${post[1]}`
      contentHTML += `<a href="${url}" rel="noreferrer" title="${title}">${title}</a>${separator}`
    })

    const repeatedContent = contentHTML.repeat(5)

    marqueeContainer.innerHTML = `<div class="marquee-content">${repeatedContent}</div>`
  } catch (error) {
    console.error(
      `Marquee Error: Terjadi kesalahan saat memproses data:`,
      error,
    )
    marqueeContainer.innerHTML =
      '<p style="margin:0; text-align:center; color: red;">Gagal memuat artikel terkait.</p>'
  }
}

/**
 * Inisialisasi kontrol slider untuk mengubah kecepatan Marquee (tetap sama).
 */
function initMarqueeSpeedControl(sliderId, contentClass) {
  const slider = document.getElementById(sliderId)
  const content = document.querySelector(`.${contentClass}`)

  if (!slider || !content) {
    // Ini normal jika slider tidak selalu ada di halaman
    return
  }

  const applySpeed = (value) => {
    const duration = value
    content.style.animationDuration = `${duration}s`
  }

  applySpeed(slider.value)

  slider.addEventListener('input', (e) => {
    applySpeed(e.target.value)
  })
}
