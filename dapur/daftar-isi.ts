// Simpan sebagai extract.ts
// Jalankan dengan: bun extract.ts

const data = await Bun.file('artikel.json').json();

// Kumpulkan semua artikel
const allArticles = [];

for (const [category, articles] of Object.entries(data)) {
    for (const item of articles) {
        // [0]=Title, [1]=Slug, [2]=Image(Dibuang), [3]=Date, [4]=Description
        const [title, slug, , date, desc] = item;

        // Bersihkan title dan desc dari karakter pemisah (#) agar struktur tetap aman
        const cleanTitle = (title || '').replace(/#/g, '-');
        const cleanDesc = (desc || '').replace(/#/g, '-');

        allArticles.push({
            category,
            title: cleanTitle,
            slug,
            date,
            desc: cleanDesc
        });
    }
}

// Urutkan berdasarkan tanggal (paling baru di atas)
allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// Bangun output string dengan urutan: Date#Category#Title#Slug#Description
const output = allArticles
.map(a => `${a.date}#${a.category}#${a.title}#${a.slug}#${a.desc}`)
.join('\n');

await Bun.write('daftar-isi.txt', output);