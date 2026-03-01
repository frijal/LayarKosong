/**
 * =================================================================================
 * Dashboard Manager v4.3 (TypeScript Edition)
 * =================================================================================
 */

// Definisi Struktur Data Artikel (Title, File, Image, Lastmod, Description)
type Article = [string, string, string, string, string];
interface ArtikelData {
    [category: string]: Article[];
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('categories') as HTMLElement;
    if (!container) {
        console.error('Container #categories tidak ditemukan!');
        return;
    }

    // Tambahkan search bar dan tombol
    const searchContainer = document.createElement('div');
    searchContainer.style.textAlign = 'center';
    searchContainer.style.marginBottom = '10px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Cari artikel...';
    searchInput.style.padding = '6px 10px';
    searchInput.style.width = '300px';
    searchInput.style.fontSize = '14px';
    searchInput.style.borderRadius = '4px';
    searchInput.style.border = '1px solid #ccc';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '❌';
    clearBtn.style.marginLeft = '5px';
    clearBtn.style.padding = '6px 10px';
    clearBtn.style.fontSize = '14px';
    clearBtn.style.cursor = 'pointer';

    const undoBtn = document.createElement('button');
    undoBtn.textContent = '↩️ Undo';
    undoBtn.style.marginLeft = '5px';
    undoBtn.style.padding = '6px 10px';
    undoBtn.style.fontSize = '14px';
    undoBtn.style.cursor = 'pointer';

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearBtn);
    searchContainer.appendChild(undoBtn);
    (container.parentNode as Node).insertBefore(searchContainer, container);

    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

    // Load JSON
    let data: ArtikelData;
    try {
        const res = await fetch('../artikel.json');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        data = await res.json();
    } catch (err) {
        console.error('Gagal load artikel.json:', err);
        return;
    }

    // Urutkan kategori berdasarkan tanggal 'lastmod' terbaru
    const categories: string[] = Object.keys(data)
        .map((cat) => {
            const latestDate = data[cat].reduce((latest, article) => {
                const articleDate = new Date(article[3]);
                return articleDate > latest ? articleDate : latest;
            }, new Date(0));
            return { name: cat, latestDate: latestDate };
        })
        .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime())
        .map((c) => c.name);

    const columnCount = 3;
    const originalData: ArtikelData = JSON.parse(JSON.stringify(data));

    // Drag & Drop Logic
    let draggedItem: HTMLElement | null = null;

    function addDragEvents(el: HTMLElement) {
        el.addEventListener('dragstart', (e: DragEvent) => {
            draggedItem = el;
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => (el.style.display = 'none'), 0);
        });
        el.addEventListener('dragend', () => {
            if (draggedItem) draggedItem.style.display = 'flex';
            draggedItem = null;
        });
    }

    function addDropEvents(list: HTMLElement) {
        list.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
        list.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            if (draggedItem) list.appendChild(draggedItem);
        });
    }

    // Context Menu Logic
    interface CustomContextMenu extends HTMLDivElement {
        currentItem?: HTMLElement | null;
    }

    let contextMenu = document.createElement('div') as CustomContextMenu;
    contextMenu.id = 'contextMenu';
    document.body.appendChild(contextMenu);

    function buildContextMenu() {
        contextMenu.innerHTML = '';
        categories.forEach((cat) => {
            const opt = document.createElement('div');
            opt.textContent = cat;
            opt.addEventListener('click', () => {
                if (contextMenu.currentItem) {
                    const targetList = document.querySelector(`.item-list[data-category="${cat}"]`);
                    if (targetList) targetList.appendChild(contextMenu.currentItem);
                    contextMenu.currentItem = null;
                }
                contextMenu.style.display = 'none';
            });
            contextMenu.appendChild(opt);
        });
    }

    buildContextMenu();

    document.addEventListener('click', (e: MouseEvent) => {
        if (!contextMenu.contains(e.target as Node)) {
            contextMenu.style.display = 'none';
        }
    });

    function addContextMenu(el: HTMLElement) {
        el.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            contextMenu.currentItem = el;
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.style.display = 'block';
        });
    }

    // Render kategori
    function renderCategories(renderData: ArtikelData) {
        container.innerHTML = '';
        const cols = Array.from({ length: columnCount }, () => {
            const col = document.createElement('div');
            col.className = 'column';
            col.style.minWidth = '250px';
            col.style.margin = '0 10px';
            container.appendChild(col);
            return col;
        });

        categories.forEach((cat, index) => {
            const col = cols[index % columnCount];
            const catDiv = document.createElement('details');
            catDiv.className = 'category';
            catDiv.dataset.category = cat;
            catDiv.open = true;

            const header = document.createElement('summary');
            const itemCount = renderData[cat] ? renderData[cat].length : 0;
            header.textContent = `${cat} (${itemCount})`;
            catDiv.appendChild(header);

            const list = document.createElement('div');
            list.className = 'item-list';
            list.dataset.category = cat;

            if (renderData[cat]) {
                const sortedItems = [...renderData[cat]].sort((a, b) =>
                    new Date(b[3]).getTime() - new Date(a[3]).getTime()
                );

                sortedItems.forEach((arr) => {
                    const [title, file, image, lastmod, description] = arr;
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'item';
                    itemDiv.draggable = true;
                    itemDiv.dataset.file = file;
                    itemDiv.dataset.image = image;
                    itemDiv.dataset.lastmod = lastmod;
                    itemDiv.dataset.description = description;

                    itemDiv.style.padding = '8px';
                    itemDiv.style.marginBottom = '5px';
                    itemDiv.style.borderBottom = '1px solid #eee';
                    itemDiv.style.display = 'flex';
                    itemDiv.style.alignItems = 'center';
                    itemDiv.style.gap = '10px';

                    const img = document.createElement('img');
                    img.src = image;
                    img.alt = title;
                    img.style.width = '40px';
                    img.style.height = '40px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '4px';

                    const span = document.createElement('span');
                    span.textContent = title;
                    span.style.fontSize = '13px';

                    itemDiv.appendChild(img);
                    itemDiv.appendChild(span);

                    addDragEvents(itemDiv);
                    addContextMenu(itemDiv);
                    list.appendChild(itemDiv);
                });
            }

            catDiv.appendChild(list);
            col.appendChild(catDiv);
            addDropEvents(list);
        });
    }

    renderCategories(data);

    // Download JSON
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const newData: ArtikelData = {};
            document.querySelectorAll<HTMLDetailsElement>('.category').forEach((catDiv) => {
                const catName = catDiv.dataset.category || 'Uncategorized';
                const items: Article[] = [];
                catDiv.querySelectorAll<HTMLElement>('.item').forEach((itemDiv) => {
                    const span = itemDiv.querySelector('span');
                    items.push([
                        span ? span.textContent || '' : '',
                        itemDiv.dataset.file || '',
                        itemDiv.dataset.image || '',
                        itemDiv.dataset.lastmod || '',
                        itemDiv.dataset.description || '',
                    ]);
                });
                newData[catName] = items;
            });

            const blob = new Blob([JSON.stringify(newData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'artikel.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Search + Highlight
    function highlightText(text: string) {
        const regex = new RegExp(`(${text})`, 'gi');
        document.querySelectorAll<HTMLElement>('.item').forEach((item) => {
            const span = item.querySelector('span') as HTMLElement;
            const original = span.dataset.original || span.textContent || '';
            if (!span.dataset.original) span.dataset.original = original;

            if (!text) {
                span.innerHTML = original;
                item.style.display = 'flex';
            } else if (original.toLowerCase().includes(text.toLowerCase())) {
                span.innerHTML = original.replace(regex, '<mark>$1</mark>');
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', (e) => highlightText((e.target as HTMLInputElement).value));
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        highlightText('');
    });

    // Undo
    undoBtn.addEventListener('click', () => renderCategories(originalData));
});
