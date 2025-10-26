const visitedLinks = JSON.parse(localStorage.getItem('visitedLinks') || '[]')
let grouped = {}

const categoryColors = [
'linear-gradient(90deg, #004d40, #26a69a)',
'linear-gradient(90deg, #00796b, #009688)',
'linear-gradient(90deg, #00897b, #01579b)',
'linear-gradient(90deg, #009688, #4db6ac)',
'linear-gradient(90deg, #00acc1, #26c6da)',
'linear-gradient(90deg, #0288d1, #03a9f4)',
'linear-gradient(90deg, #0d47a1, #00bcd4)',
'linear-gradient(90deg, #0d47a1, #1976d2)',
'linear-gradient(90deg, #1565c0, #64b5f6)',
'linear-gradient(90deg, #1976d2, #2196f3)',
'linear-gradient(90deg, #1a237e, #3949ab)',
'linear-gradient(90deg, #1b5e20, #4caf50)',
'linear-gradient(90deg, #212121, #616161)',
'linear-gradient(90deg, #212121, #455a64)',
'linear-gradient(90deg, #2196f3, #00bcd4)',
'linear-gradient(90deg, #2e7d32, #8bc34a)',
'linear-gradient(90deg, #2e7d32, #4caf50)',
'linear-gradient(90deg, #33691e, #8bc34a)',
'linear-gradient(90deg, #37474f, #b0bec5)',
'linear-gradient(90deg, #388e3c, #4caf50)',
'linear-gradient(90deg, #3e2723, #a1887f)',
'linear-gradient(90deg, #3e2723, #ffc107)',
'linear-gradient(90deg, #607d8b, #9e9e9e)',
'linear-gradient(90deg, #6d4c41, #ffb300)',
'linear-gradient(90deg, #b71c1c, #ff7043)',
'linear-gradient(90deg, #cddc39, #8bc34a)',
'linear-gradient(90deg, #d32f2f, #f44336)',
'linear-gradient(90deg, #d84315, #ffca28)',
'linear-gradient(90deg, #e65100, #ffab00)',
'linear-gradient(90deg, #f44336, #ff9800)',
'linear-gradient(90deg, #f57c00, #ff9800)',
'linear-gradient(90deg, #fbc02d, #ffeb3b)',
]

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}.${mm}.${yy}`
}

function updateStats(total, read, term = '') {
  const totalCountEl = document.getElementById('totalCount')
  if (term) {
    totalCountEl.innerHTML = `Menemukan <strong>${total}</strong> artikel dari pencarian "${term}"`
    return
  }
  const unread = total - read
  totalCountEl.innerHTML = `
        <span class="total-stat">Total: <strong>${total}</strong></span>
        <span class="separator">|</span>
        <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> 👍</span>
        <span class="separator">|</span>
        <span class="unread-stat">Belum Dibaca: <strong>${unread}</strong> 📚</span>
    `
}

async function loadTOC() {
  try {
    const res = await fetch('artikel.json')
    const data = await res.json()
    const toc = document.getElementById('toc')
    toc.innerHTML = ''
    grouped = {}
    Object.keys(data).forEach((cat) => {
      grouped[cat] = data[cat]
        .map((arr) => ({
          title: arr[0],
          file: arr[1],
          image: arr[2],
          lastmod: arr[3],
          description: arr[4],
          category: cat,
        }))
        .sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod))
    })
    const totalArticles = Object.values(grouped).reduce(
      (sum, arr) => sum + arr.length,
      0,
    )
    updateStats(totalArticles, visitedLinks.length)

    const shuffledColors = shuffle([...categoryColors])

    const categoryTooltip = document.getElementById('category-tooltip')

    Object.keys(grouped)
      .sort((a, b) => {
        const lastUpdateA = new Date(grouped[a][0].lastmod)
        const lastUpdateB = new Date(grouped[b][0].lastmod)
        return lastUpdateB - lastUpdateA
      })
      .forEach((cat, index) => {
        const catDiv = document.createElement('div')
        catDiv.className = 'category'
        const color = shuffledColors[index % shuffledColors.length]
        catDiv.style.setProperty('--category-color', color)
        catDiv.innerHTML = `
                  <div class="category-content">
                      <div class="category-header">
                        ${cat} <span class="badge">${grouped[cat].length}</span>
                      </div>
                      <div class="toc-list" style="display: none;"></div>
                  </div>
                `
        const catList = catDiv.querySelector('.toc-list')
        grouped[cat].forEach((item) => {
          const el = document.createElement('div')
          el.className = 'toc-item'
          el.dataset.text = item.title.toLowerCase()
          const titleDiv = document.createElement('div')
          titleDiv.className = 'toc-title'
          const a = document.createElement('a')
          a.href = `artikel/${item.file}`
          a.textContent = item.title
          const statusSpan = document.createElement('span')
          if (visitedLinks.includes(item.file)) {
            statusSpan.className = 'label-visited'
            statusSpan.textContent = 'sudah dibaca 👍'
            a.classList.add('visited')
          } else {
            statusSpan.className = 'label-new'
            statusSpan.textContent = '📚 belum dibaca'
          }
          const dateSpan = document.createElement('span')
          dateSpan.className = 'toc-date'
          dateSpan.textContent = `[${formatDate(item.lastmod)}]`
          a.addEventListener('click', () => {
            if (!visitedLinks.includes(item.file)) {
              visitedLinks.push(item.file)
              localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks))
              statusSpan.className = 'label-visited'
              statusSpan.textContent = 'sudah dibaca 👍'
              a.classList.add('visited')
              updateStats(totalArticles, visitedLinks.length)
            }
          })

          const description = item.description || 'Tidak ada deskripsi.'
          a.addEventListener('mouseenter', () => {
            categoryTooltip.innerHTML = description
            categoryTooltip.style.display = 'block'
          })
          a.addEventListener('mousemove', (e) => {
            categoryTooltip.style.left = e.clientX + 15 + 'px'
            categoryTooltip.style.top = e.clientY + 15 + 'px'
          })
          a.addEventListener('mouseleave', () => {
            categoryTooltip.style.display = 'none'
          })

          titleDiv.appendChild(a)
          titleDiv.appendChild(statusSpan)
          titleDiv.appendChild(dateSpan)
          el.appendChild(titleDiv)
          catList.appendChild(el)
        })

        const catHeader = catDiv.querySelector('.category-header')
        catHeader.addEventListener('click', () => {
          catList.style.display =
            catList.style.display === 'block' ? 'none' : 'block'
          updateTOCToggleText()
        })

        toc.appendChild(catDiv)
      })

    const m = document.getElementById('marquee-content')
    const allArticles = Object.values(grouped).flat()
    const shuffledMarquee = shuffle([...allArticles])

    const marqueeHTML = shuffledMarquee
      .map((d) => {
        const cleanDescription = (
          d.description || 'Tidak ada deskripsi.'
        ).replace(/"/g, '&quot;')
        return `<a href="artikel/${d.file}" data-description="${cleanDescription}">${d.title}</a>`
      })
      .join(' &bull; ')
    m.innerHTML = marqueeHTML

    const marqueeTooltip = document.getElementById('marquee-tooltip')
    const marqueeLinks = document.querySelectorAll('#marquee-content a')

    marqueeLinks.forEach((link) => {
      link.addEventListener('mouseover', (e) => {
        const description = e.target.getAttribute('data-description')
        if (description) {
          marqueeTooltip.innerHTML = description
          marqueeTooltip.style.display = 'block'
        }
      })
      link.addEventListener('mousemove', (e) => {
        marqueeTooltip.style.left = e.clientX + 15 + 'px'
        marqueeTooltip.style.top = e.clientY + 15 + 'px'
      })
      link.addEventListener('mouseout', () => {
        marqueeTooltip.style.display = 'none'
      })
    })
  } catch (e) {
    console.error('Gagal load artikel.json', e)
    toc.innerHTML = '<p style="color: red;">Gagal memuat daftar isi.</p>'
  }
}

const searchInput = document.getElementById('search')
const clearBtn = document.getElementById('clearSearch')

searchInput.addEventListener('input', function () {
  const term = this.value.toLowerCase()
  clearBtn.style.display = this.value ? 'block' : 'none'
  let countVisible = 0
  const allArticlesCount = Object.values(grouped).flat().length
  document.querySelectorAll('.category').forEach((category) => {
    let catVisible = false
    category.querySelectorAll('.toc-item').forEach((item) => {
      const text = item.dataset.text
      const titleLink = item.querySelector('a')
      if (term && text.includes(term)) {
        item.style.display = 'flex'
        catVisible = true
        countVisible++
        const regex = new RegExp(`(${term})`, 'gi')
        titleLink.innerHTML = text.replace(
          regex,
          '<span class="highlight">$1</span>',
        )
      } else if (!term) {
        item.style.display = 'flex'
        titleLink.textContent = text
        catVisible = true
      } else {
        item.style.display = 'none'
      }
    })
    category.style.display = catVisible ? 'block' : 'none'
    const tocList = category.querySelector('.toc-list')
    if (tocList) {
      tocList.style.display = term && catVisible ? 'block' : 'none'
    }
  })
  if (term) {
    updateStats(countVisible, visitedLinks.length, term)
  } else {
    updateStats(allArticlesCount, visitedLinks.length)
  }
  updateTOCToggleText()
})

clearBtn.addEventListener('click', () => {
  searchInput.value = ''
  searchInput.dispatchEvent(new Event('input'))
})

let tocCollapsed = false
const tocToggleBtn = document.getElementById('tocToggle')

function updateTOCToggleText() {
  const allLists = Array.from(document.querySelectorAll('.toc-list'))
  if (allLists.length === 0) return
  const allCollapsed = allLists.every((list) => list.style.display === 'none')
  tocCollapsed = allCollapsed
  tocToggleBtn.textContent = tocCollapsed ? 'Buka Semua' : 'Tutup Semua'
}

tocToggleBtn.addEventListener('click', () => {
  tocCollapsed = !tocCollapsed
  document.querySelectorAll('.toc-list').forEach((list) => {
    list.style.display = tocCollapsed ? 'none' : 'block'
  })
  updateTOCToggleText()
})

function initDarkMode() {
  const darkSwitch = document.getElementById('darkSwitch')
  const saved = localStorage.getItem('darkMode')

  function setDarkMode(isDark) {
    if (isDark) document.body.classList.add('dark-mode')
    else document.body.classList.remove('dark-mode')
    if (darkSwitch) darkSwitch.checked = isDark
  }

  if (saved !== null) {
    setDarkMode(saved === 'true')
  } else {
    setDarkMode(
      window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches,
    )
  }

  if (darkSwitch) {
    darkSwitch.addEventListener('change', () => {
      localStorage.setItem('darkMode', darkSwitch.checked)
      setDarkMode(darkSwitch.checked)
    })
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTOC().then(() => {
    initDarkMode()
    updateTOCToggleText()
  })
})
