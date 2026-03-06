import { file, write } from 'bun'; // Import API secara eksplisit
import { Glob } from 'bun';

const C = {
    // Gunakan path absolut yang lebih aman
    art: `${import.meta.dir}/../artikel`,
};

(async () => {
    console.log('🔄 Memulai injeksi tanggal...');
    
    // Pastikan path ke artikel.json benar
    const masterPath = `${C.art}/artikel.json`;
    const masterData = await file(masterPath).json().catch(() => ({}));
    
    // Tambahkan pengecekan apakah masterData kosong
    if (Object.keys(masterData).length === 0) {
        console.error('❌ Gagal membaca atau artikel.json kosong di:', masterPath);
        return;
    }
    
    for (const [category, articles] of Object.entries(masterData)) {
        for (const article of (articles as any[])) {
            const fileName = article[1]; 
            const publishDate = article[3]; 
            
            const rawFilePath = `${C.art}/${fileName}`;
            
            // Gunakan API file() yang sudah diimport
            if (await file(rawFilePath).exists()) {
                let content = await file(rawFilePath).text();
                
                const hasMeta = /<meta\s+[^>]*property=["']article:published_time["'][^>]*>/i.test(content);
                
                if (!hasMeta) {
                    const metaTag = `<meta property="article:published_time" content="${publishDate}">`;
                    content = content.replace(/<head>/i, `<head>\n    ${metaTag}`);
                    
                    await write(rawFilePath, content);
                    console.log(`✅ Ditambahkan: ${fileName}`);
                } else {
                    console.log(`⏩ Dilewati: ${fileName}`);
                }
            } else {
                console.warn(`⚠️ File tidak ditemukan: ${rawFilePath}`);
            }
        }
    }
    console.log('✨ Selesai!');
})();
