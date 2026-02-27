import { visitedLinks, markVisited } from './visited.js'
import { initMarquee } from './marquee.js'

export async function loadTOC() {
  try {
    const res = await fetch('artikel.json')
    const data = await res.json()
    const toc = document.getElementById('toc')
    toc.innerHTML = ''
    const totalCount = document.getElementById('totalCount')

    const grouped = {}
    Object.keys(data).forEach((cat) => {
      grouped[cat] = data[cat].map((arr) => ({
        title: arr[0],
        file: arr[1],
        category: cat,
      }))
    })

    totalCount.textContent = `Total artikel: ${Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)}`

    Object.keys(grouped)
      .sort((a, b) => grouped[b].length - grouped[a].length)
      .forEach((cat) => {
        const catDiv = document.createElement('div')
        catDiv.className = 'category'
        catDiv.innerHTML = `
          <div class="category-header">
            ${cat} <span class="badge">${grouped[cat].length}</span>
          </div>
          <div class="toc-list"></div>
        `
        const catList = catDiv.querySelector('.toc-list')

        grouped[cat].forEach((item, i) => {
          const el = document.createElement('div')
          el.className = 'toc-item'
          el.dataset.text = item.title.toLowerCase()

          const a = document.createElement('a')
          a.href = `artikel/${item.file}`
          a.target = ''
          a.textContent = `${i + 1}. ${item.title}`

          const statusSpan = document.createElement('span')
          if (visitedLinks.includes(item.file)) {
            statusSpan.className = 'label-visited'
            statusSpan.textContent = 'sudah dibaca 👍'
            a.classList.add('visited')
          } else {
            statusSpan.className = 'label-new'
            statusSpan.textContent = '📚 belum dibaca'
          }

          a.addEventListener('click', () =>
            markVisited(item.file, a, statusSpan),
          )

          const titleDiv = document.createElement('div')
          titleDiv.className = 'toc-title'
          titleDiv.appendChild(a)
          titleDiv.appendChild(statusSpan)
          el.appendChild(titleDiv)
          catList.appendChild(el)
        })

        catDiv
          .querySelector('.category-header')
          .addEventListener('click', () => {
            catList.style.display =
              catList.style.display === 'block' ? 'none' : 'block'
            updateTOCToggleText()
          })

        toc.appendChild(catDiv)
      })

    initMarquee(grouped)
    initSearch(grouped)
    initTOCToggle()
  } catch (e) {
    console.error('Gagal load artikel.json:', e)
  }
}

// --- Search ---
function initSearch(grouped) {
  const searchInput = document.getElementById('search')
  const totalCount = document.getElementById('totalCount')

  searchInput.addEventListener('input', function () {
    const term = this.value.toLowerCase()
    let countVisible = 0

    document.querySelectorAll('.category').forEach((category) => {
      let catVisible = false
      category.querySelectorAll('.toc-item').forEach((item) => {
        const text = item.dataset.text
        const link = item.querySelector('a')
        if (term && text.includes(term)) {
          item.style.display = 'flex'
          catVisible = true
          countVisible++
          const regex = new RegExp(`(${term})`, 'gi')
          link.innerHTML = link.textContent.replace(
            regex,
            '<span class="highlight">$1</span>',
          )
        } else {
          item.style.display = term ? 'none' : 'flex'
          link.innerHTML = link.textContent
          if (!term) countVisible++
        }
      })
      category.style.display = catVisible ? 'block' : term ? 'none' : 'block'
      const tocList = category.querySelector('.toc-list')
      tocList.style.display = catVisible ? 'block' : tocList.style.display
    })

    totalCount.textContent = `Total artikel: ${countVisible}`
    updateTOCToggleText()
  })
}

// --- TOC Toggle ---
let tocCollapsed = false
function initTOCToggle() {
  const tocToggleBtn = document.getElementById('tocToggle')
  function updateTOCToggleText() {
    const allCollapsed = Array.from(
      document.querySelectorAll('.toc-list'),
    ).every((list) => list.style.display === 'none')
    tocCollapsed = allCollapsed
    tocToggleBtn.textContent = tocCollapsed ? 'Buka' : 'Tutup'
  }

  tocToggleBtn.addEventListener('click', () => {
    tocCollapsed = !tocCollapsed
    document.querySelectorAll('.toc-list').forEach((list) => {
      list.style.display = tocCollapsed ? 'none' : 'block'
    })
    tocToggleBtn.textContent = tocCollapsed ? 'Buka' : 'Tutup'
  })

  updateTOCToggleText()
}
