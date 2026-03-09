// Simpan sebagai extract.ts (atau .js)
// Jalankan dengan: bun extract.ts

const data = await Bun.file('artikel.json').json();
let output = '';

for (const [category, articles] of Object.entries(data)) {
    for (const item of articles) {
        // [0]=Title, [1]=Slug, [2]=Image(Dibuang), [3]=Date, [4]=Description
        const [title, slug, , date, desc] = item;
        const cleanDesc = (desc || '').replace(/\|/g, '-');
        
        output += `${category}|${title}|${slug}|${date}|${cleanDesc}\n`;
    }
}

await Bun.write('daftar-isi.txt', output.trim());
console.log('Mantap! artikel.txt sudah jadi dengan Bun 🚀');
