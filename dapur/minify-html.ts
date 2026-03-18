import { minify } from '@minify-html/node';
import { Glob, file as bunFile, write, nanoseconds } from "bun";
// ========== TYPES ==========
interface ErrorDetail {
    path: string;
    error: string;
}
interface Stats {
    success: number;
    skipped: number;
    failed: number;
    errorList: ErrorDetail[];
    totalSaved: number;
    totalBefore: number;
    totalAfter: number;
}
// ========== CONFIG ==========
const folders: string[] = [
    'gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 
    'opini-sosial', 'sistem-terbuka', 'warta-tekno'
];
let stats: Stats = {
    success: 0, skipped: 0, failed: 0, errorList: [], 
    totalSaved: 0, totalBefore: 0, totalAfter: 0
};
// ========== UTILITIES ==========
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
const softMinifyJS = (code: string): string => 
    code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/\n\s+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
async function processFile(filePath: string): Promise<void> {
    try {
        const f = bunFile(filePath);
        let html = await f.text();
        
        // Cek apakah sudah pernah diproses oleh script ini
        if (!html.trim() || html.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
            stats.skipped++;
            return;
        }
        
        if (filePath === 'index.html') {
            stats.skipped++;
            return;
        }
        
        const sizeBefore = Buffer.byteLength(html, 'utf8');
        const scriptPlaceholders = new Map<string, string>();
        let scriptCounter = 0;
        
        // TAHAP 1: PROTEKSI SCRIPT
        html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
            if (/src\s*=/.test(match)) return match;
            
            const isJsonLd = /type\s*=\s*['"]?application\/ld\+json['"]?/i.test(match);
            const processed = isJsonLd 
                ? content.replace(/\s+/g, ' ').trim() 
                : softMinifyJS(content);
            
            const id = `___LK_JS_${scriptCounter++}___`;
            const openingTag = match.match(/<script[^>]*>/i)?.[0] || '<script>';
            scriptPlaceholders.set(id, `${openingTag}${processed}</script>`);
            return id;
        });
        
        // TAHAP 2: MINIFY HTML
        const output = minify(Buffer.from(html), {
		allow_noncompliant_unquoted_attribute_values: true,
        collapse_whitespaces: true,
		ensure_spec_compliant_unquoted_attribute_values: true,
        keep_comments: false,
        keep_html_and_head_opening_tags: true,
        keep_spaces_between_attributes: false,
        minify_css: true,
        });
        
        let minifiedHTML = output.toString();
        
        // TAHAP 3: INJEKSI BALIK & SIGNATURE (RAPAT)
for (const [id, fullTag] of scriptPlaceholders) {
    minifiedHTML = minifiedHTML.replace(id, fullTag);
}
const tgl = new Date().toISOString().slice(0, 10);
const signature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;
// Hapus tag </html> lama, lalu gabungkan tanpa baris baru
minifiedHTML = minifiedHTML.replace(/<\/html>\s*$/i, '').trimEnd() + `${signature}</html>`;
await write(filePath, minifiedHTML);
        
        stats.success++;
        stats.totalBefore += sizeBefore;
        stats.totalAfter += sizeAfter;
        stats.totalSaved += (sizeBefore - sizeAfter);
        
    } catch (err: any) {
        stats.failed++;
        stats.errorList.push({ path: filePath, error: err.message });
    }
}
async function run(): Promise<void> {
    console.log('🧼 Memulai Minify Ultra (Full Parallel Mode)...');
    console.log('📂 Lokasi: Balikpapan | User: Fakhrul Rijal | Status: No Limit 🚀');
    
    const startTime = nanoseconds();
    const fileList: string[] = [];
    
    // Scan files
    if (await bunFile("feed.html").exists()) fileList.push("feed.html");
    for (const folder of folders) {
        const glob = new Glob(`${folder}/**/*.html`);
        for (const file of glob.scanSync(".")) fileList.push(file);
    }
    
    // Hajar semua sekaligus
    await Promise.all(fileList.map(file => processFile(file)));
    
    const endTime = nanoseconds();
    const duration = (endTime - startTime) / 1e9;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REKAP PROSES LAYAR KOSONG (BUN NATIVE)');
    console.log('='.repeat(60));
    console.log(`⏱️ Waktu Tempuh      : ${duration.toFixed(4)} detik`);
    console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
    console.log(`⏭️ Sudah Dijepit      : ${stats.skipped} file`);
    console.log(`❌ Gagal Proses       : ${stats.failed} file`);
    console.log('-'.repeat(60));
    const savingPercent = stats.totalBefore > 0 ? ((stats.totalSaved / stats.totalBefore) * 100).toFixed(2) : "0";
    console.log(`📉 Total Sebelum      : ${formatBytes(stats.totalBefore)}`);
    console.log(`📉 Total Sesudah      : ${formatBytes(stats.totalAfter)}`);
    console.log(`🚀 Ruang Dihemat      : ${formatBytes(stats.totalSaved)} (${savingPercent}%)`);
    console.log('='.repeat(60));
    
    if (stats.failed > 0) {
        console.log('\n⚠️ DETAIL ERROR:');
        stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
    }
}
run();
