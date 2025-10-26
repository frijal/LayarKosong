// ext/dashboard.js (Final + Undo + Search + Highlight + Kategori Terupdate)
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('categories')

  // Tambahkan search bar dan tombol
  const searchContainer = document.createElement('div')
  searchContainer.style.textAlign = 'center'
  searchContainer.style.marginBottom = '10px'

  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.placeholder = '🔍 Cari artikel...'
  searchInput.style.padding = '6px 10px'
  searchInput.style.width = '300px'
  searchInput.style.fontSize = '14px'
  searchInput.style.borderRadius = '4px'
  searchInput.style.border = '1px solid #ccc'

  const clearBtn = document.createElement('button')
  clearBtn.textContent = '❌'
  clearBtn.style.marginLeft = '5px'
  clearBtn.style.padding = '6px 10px'
  clearBtn.style.fontSize = '14px'
  clearBtn.style.cursor = 'pointer'

  const undoBtn = document.createElement('button')
  undoBtn.textContent = '↩️ Undo'
  undoBtn.style.marginLeft = '5px'
  undoBtn.style.padding = '6px 10px'
  undoBtn.style.fontSize = '14px'
  undoBtn.style.cursor = 'pointer'

  searchContainer.appendChild(searchInput)
  searchContainer.appendChild(clearBtn)
  searchContainer.appendChild(undoBtn)
  container.parentNode.insertBefore(searchContainer, container)

  const downloadBtn = document.getElementById('downloadBtn')

  if (!container) {
    console.error('Container #categories tidak ditemukan!')
    return
  }

  // Load JSON
  let data
  try {
    const res = await fetch('../artikel.json')
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    data = await res.json()
  } catch (err) {
    console.error('Gagal load artikel.json:', err)
    return
  }

  // === PERUBAHAN DIMULAI ===
  // Urutkan kategori berdasarkan tanggal 'lastmod' dari artikel terbaru di dalamnya
  const categories = Object.keys(data)
    .map((cat) => {
      // Cari tanggal paling baru di setiap kategori
      const latestDate = data[cat].reduce((latest, article) => {
        const articleDate = new Date(article[3]) // article[3] adalah lastmod
        return articleDate > latest ? articleDate : latest
      }, new Date(0)) // Mulai dengan tanggal paling awal
      return { name: cat, latestDate: latestDate }
    })
    .sort((a, b) => b.latestDate - a.latestDate) // Urutkan dari terbaru ke terlama
    .map((c) => c.name) // Ambil kembali hanya nama kategorinya
  // === PERUBAHAN SELESAI ===

  const columnCount = 3
  const columns = Array.from({ length: columnCount }, () => {
    const col = document.createElement('div')
    col.className = 'column'
    container.appendChild(col)
    return col
  })

  // Simpan posisi awal untuk Undo
  const originalData = JSON.parse(JSON.stringify(data))

  // Drag & Drop
  let draggedItem = null

  function addDragEvents(el) {
    el.addEventListener('dragstart', (e) => {
      draggedItem = el
      e.dataTransfer.effectAllowed = 'move'
      setTimeout(() => (el.style.display = 'none'), 0)
    })
    el.addEventListener('dragend', () => {
      draggedItem.style.display = 'flex'
      draggedItem = null
    })
  }

  function addDropEvents(list) {
    list.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    })
    list.addEventListener('drop', (e) => {
      e.preventDefault()
      if (draggedItem) list.appendChild(draggedItem)
    })
  }

  // Context Menu
  let contextMenu = document.createElement('div')
  contextMenu.id = 'contextMenu'
  document.body.appendChild(contextMenu)

  function buildContextMenu() {
    contextMenu.innerHTML = ''
    categories.forEach((cat) => {
      const opt = document.createElement('div')
      opt.textContent = cat
      opt.addEventListener('click', () => {
        if (contextMenu.currentItem) {
          const targetList = document.querySelector(
            `.item-list[data-category="${cat}"]`,
          )
          if (targetList) targetList.appendChild(contextMenu.currentItem)
          contextMenu.currentItem = null
        }
        contextMenu.style.display = 'none'
      })
      contextMenu.appendChild(opt)
    })
  }

  buildContextMenu()

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none'
    }
  })

  function addContextMenu(el) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      contextMenu.currentItem = el
      contextMenu.style.left = e.pageX + 'px'
      contextMenu.style.top = e.pageY + 'px'
      contextMenu.style.display = 'block'
    })
  }

  // Render kategori
  function renderCategories(renderData) {
    container.innerHTML = ''
    const cols = Array.from({ length: columnCount }, () => {
      const col = document.createElement('div')
      col.className = 'column'
      container.appendChild(col)
      return col
    })

    // Gunakan 'categories' yang sudah diurutkan
    categories.forEach((cat, index) => {
      const col = cols[index % columnCount]
      const catDiv = document.createElement('div')
      catDiv.className = 'category'
      catDiv.dataset.category = cat

      const header = document.createElement('h3')
      header.textContent = cat
      catDiv.appendChild(header)

      const list = document.createElement('div')
      list.className = 'item-list'
      list.dataset.category = cat

      // sort by latest date
      const sortedItems = renderData[cat]
        .slice()
        .sort((a, b) => new Date(b[3]) - new Date(a[3]))

      sortedItems.forEach((arr) => {
        const [title, file, image, lastmod, description] = arr

        const itemDiv = document.createElement('div')
        itemDiv.className = 'item'
        itemDiv.draggable = true
        itemDiv.dataset.file = file
        itemDiv.dataset.image = image
        itemDiv.dataset.lastmod = lastmod
        itemDiv.dataset.description = description

        const img = document.createElement('img')
        img.src = image
        img.alt = title

        const span = document.createElement('span')
        span.textContent = title

        itemDiv.appendChild(img)
        itemDiv.appendChild(span)

        addDragEvents(itemDiv)
        addContextMenu(itemDiv)
        list.appendChild(itemDiv)
      })

      catDiv.appendChild(list)
      col.appendChild(catDiv)
      addDropEvents(list)
    })
  }

  renderCategories(data)

  // Download JSON
  downloadBtn.addEventListener('click', () => {
    const newData = {}
    document.querySelectorAll('.category').forEach((catDiv) => {
      const catName = catDiv.dataset.category
      const items = []
      catDiv.querySelectorAll('.item').forEach((itemDiv) => {
        items.push([
          itemDiv.querySelector('span').textContent,
          itemDiv.dataset.file,
          itemDiv.dataset.image,
          itemDiv.dataset.lastmod,
          itemDiv.dataset.description,
        ])
      })
      newData[catName] = items
    })

    const blob = new Blob([JSON.stringify(newData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'artikel.json'
    a.click()
    URL.revokeObjectURL(url)
  })

  // === Search + Highlight ===
  function highlightText(text) {
    const regex = new RegExp(`(${text})`, 'gi')
    document.querySelectorAll('.item').forEach((item) => {
      const span = item.querySelector('span')
      const original = span.dataset.original || span.textContent
      span.dataset.original = original
      if (!text) {
        span.innerHTML = original
        item.style.display = 'flex'
      } else if (original.toLowerCase().includes(text.toLowerCase())) {
        span.innerHTML = original.replace(regex, '<mark>$1</mark>')
        item.style.display = 'flex'
      } else {
        item.style.display = 'none'
      }
    })
  }

  searchInput.addEventListener('input', (e) => highlightText(e.target.value))
  clearBtn.addEventListener('click', () => {
    searchInput.value = ''
    highlightText('')
  })

  // Undo
  undoBtn.addEventListener('click', () => renderCategories(originalData))
})
