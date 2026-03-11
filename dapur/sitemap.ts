// -------------------------------------------------------
// FILE: sitemap.ts (OPTIMIZED PRODUCTION BUILD)
// -------------------------------------------------------

interface Article {
  title: string;
  file: string;
  lastmod: string;
  description: string;
  category: string;
}

type ArticleGroup = Record<string, Article[]>;

const getVisitedLinks = (): Set<string> => {
  try {
    const stored = localStorage.getItem('visitedLinks');
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

let visitedLinks = getVisitedLinks();
let grouped: ArticleGroup = {};

const categoryColors = [
  'linear-gradient(90deg,#004d40,#26a69a)','linear-gradient(90deg,#00796b,#009688)',
  'linear-gradient(90deg,#00897b,#01579b)','linear-gradient(90deg,#009688,#4db6ac)',
  'linear-gradient(90deg,#00acc1,#26c6da)','linear-gradient(90deg,#0288d1,#03a9f4)',
  'linear-gradient(90deg,#0d47a1,#00bcd4)','linear-gradient(90deg,#0d47a1,#1976d2)',
  'linear-gradient(90deg,#1565c0,#64b5f6)','linear-gradient(90deg,#1976d2,#2196f3)',
  'linear-gradient(90deg,#1a237e,#3949ab)','linear-gradient(90deg,#1b5e20,#4caf50)',
  'linear-gradient(90deg,#212121,#616161)','linear-gradient(90deg,#212121,#455a64)',
  'linear-gradient(90deg,#2196f3,#00bcd4)','linear-gradient(90deg,#2e7d32,#8bc34a)',
  'linear-gradient(90deg,#2e7d32,#4caf50)','linear-gradient(90deg,#33691e,#8bc34a)',
  'linear-gradient(90deg,#37474f,#b0bec5)','linear-gradient(90deg,#388e3c,#4caf50)',
  'linear-gradient(90deg,#3e2723,#a1887f)','linear-gradient(90deg,#3e2723,#ffc107)',
  'linear-gradient(90deg,#607d8b,#9e9e9e)','linear-gradient(90deg,#6d4c41,#ffb300)',
  'linear-gradient(90deg,#b71c1c,#ff7043)','linear-gradient(90deg,#cddc39,#8bc34a)',
  'linear-gradient(90deg,#d32f2f,#f44336)','linear-gradient(90deg,#d84315,#ffca28)',
  'linear-gradient(90deg,#e65100,#ffab00)','linear-gradient(90deg,#f44336,#ff9800)',
  'linear-gradient(90deg,#f57c00,#ff9800)','linear-gradient(90deg,#fbc02d,#ffeb3b)'
];

const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
};

const getCleanUrl = (file: string, category: string): string => {
  const catSlug = category.toLowerCase().replace(/\s+/g,'-');
  return `/${catSlug}/${file.replace('.html','')}`;
};

const updateStats = (total:number, read:number, term=''):void=>{
  const el=document.getElementById('totalCount');
  if(!el) return;

  if(term){
    el.innerHTML=`Menemukan <strong>${total}</strong> artikel dari pencarian "${term}"`;
    return;
  }

  const unread=total-read;

  el.innerHTML=`
  <span class="total-stat">Total: <strong>${total}</strong></span>
  <span class="separator">|</span>
  <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> 👍</span>
  <span class="separator">|</span>
  <span class="unread-stat">Belum Dibaca: <strong>${unread}</strong> 📓</span>`;
};

const saveVisited=()=>{
  localStorage.setItem('visitedLinks',JSON.stringify([...visitedLinks]));
};

const buildArticleItem=(item:Article,allCount:number)=>{
  const el=document.createElement('div');
  el.className='toc-item';
  el.dataset.text=item.title.toLowerCase();

  const titleDiv=document.createElement('div');
  titleDiv.className='toc-title';

  const a=document.createElement('a');
  a.href=getCleanUrl(item.file,item.category);
  a.textContent=item.title;

  const status=document.createElement('span');
  const date=document.createElement('span');

  date.className='toc-date';
  date.textContent=`[${formatDate(item.lastmod)}]`;

  if(visitedLinks.has(item.file)){
    status.className='label-visited';
    status.textContent='sudah dibaca 👍';
    a.classList.add('visited');
  }else{
    status.className='label-new';
    status.textContent='📓 belum dibaca';
  }

  a.onclick=()=>{
    if(!visitedLinks.has(item.file)){
      visitedLinks.add(item.file);
      saveVisited();
      updateStats(allCount,visitedLinks.size);
    }
  };

  titleDiv.append(a,status,date);
  el.appendChild(titleDiv);

  return el;
};

async function loadTOC(){

  try{

    const data=await (window as any).siteDataProvider.getFor('sitemap.ts');

    const toc=document.getElementById('toc');
    if(!toc) return;

    toc.innerHTML='';
    grouped={};

    Object.keys(data).forEach(cat=>{
      grouped[cat]=data[cat]
      .map((item:any)=>({
        title:item.title,
        file:item.id,
        lastmod:item.date,
        description:item.description,
        category:cat
      }))
      .sort((a,b)=>new Date(b.lastmod).getTime()-new Date(a.lastmod).getTime());
    });

    const allArticles=Object.values(grouped).flat();
    updateStats(allArticles.length,visitedLinks.size);

    const colors=shuffle(categoryColors);
    const frag=document.createDocumentFragment();

    Object.keys(grouped).forEach((cat,i)=>{

      const catDiv=document.createElement('div');
      catDiv.className='category';
      catDiv.style.setProperty('--category-color',colors[i%colors.length]);

      const header=document.createElement('div');
      header.className='category-header';
      header.innerHTML=`${cat} <span class="badge">${grouped[cat].length}</span>`;

      const list=document.createElement('div');
      list.className='toc-list';
      list.style.display='none';

      const listFrag=document.createDocumentFragment();

      grouped[cat].forEach(item=>{
        listFrag.appendChild(buildArticleItem(item,allArticles.length));
      });

      list.appendChild(listFrag);

      header.onclick=()=>{
        list.style.display=list.style.display==='block'?'none':'block';
      };

      catDiv.append(header,list);
      frag.appendChild(catDiv);

    });

    toc.appendChild(frag);

  }catch(e){
    console.error('loadTOC error',e);
  }

}

function initSearch(){

  const input=document.getElementById('search') as HTMLInputElement;
  const clear=document.getElementById('clearSearch');

  if(!input) return;

  input.oninput=()=>{

    const term=input.value.toLowerCase();
    if(clear) clear.style.display=term?'block':'none';

    let count=0;

    document.querySelectorAll<HTMLElement>('.toc-item').forEach(item=>{

      const text=item.dataset.text||'';

    if(!term||text.includes(term)){
      item.style.display='flex';
      count++;
    }else{
      item.style.display='none';
    }

    });

    const total=Object.values(grouped).flat().length;

    if(term) updateStats(count,visitedLinks.size,term);
    else updateStats(total,visitedLinks.size);

  };

    clear?.addEventListener('click',()=>{
      input.value='';
      input.dispatchEvent(new Event('input'));
    });

}

document.addEventListener('DOMContentLoaded',()=>{

  loadTOC();
  initSearch();

});
