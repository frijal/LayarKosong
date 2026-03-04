import fs from 'node:fs';
import path from 'node:path';

const dir = './.github/workflows';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'));

// Fungsi sederhana untuk menerjemahkan CRON ke bahasa manusia (Indonesian)
function translateCron(cron) {
    const parts = cron.split(' ');
    if (parts.length !== 5) return "Format Cron tidak valid";

    const [min, hour, dom, mon, dow] = parts;
    
    let desc = "Setiap ";

    if (min === '*' && hour === '*') desc += "menit";
    else if (hour === '*' && min !== '*') desc += `menit ke-${min}`;
    else if (hour !== '*' && min !== '*') desc += `jam ${hour.padStart(2, '0')}:${min.padStart(2, '0')} (UTC)`;

    if (dom !== '*') desc += `, tanggal ${dom}`;
    if (mon !== '*') desc += `, bulan ke-${mon}`;
    
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    if (dow !== '*') {
        const dayNames = dow.split(',').map(d => days[d] || d).join(', ');
        desc += `, hari ${dayNames}`;
    }

    if (cron === '0 0 * * *') return "Setiap tengah malam (00:00 UTC)";
    if (cron.includes('1 9 * *')) return "Setiap tanggal 9 jam 08:00 WIB";

    return desc;
}

let report = "# 🗓️ Dashboard Jadwal Otomatis Layar Kosong\n\n";
report += "> **Catatan:** Semua waktu di bawah menggunakan standar **UTC**. Tambahkan 7 jam untuk konversi ke **WIB** (Balikpapan).\n\n";
report += "| 🛠️ Nama Workflow | ⏰ Cron (UTC) | 📖 Penjelasan Waktu | 🔗 Link Alat |\n";
report += "| :--- | :--- | :--- | :--- |\n";

files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Cari baris cron (regex lebih kuat untuk handle single/double quotes)
    const cronMatch = content.match(/cron:\s*['"]?([^'#\n\r"']+)['"]?/);
    const nameMatch = content.match(/name:\s*(.+)/);

    if (cronMatch) {
        const name = nameMatch ? nameMatch[1].trim() : file;
        const cron = cronMatch[1].trim();
        const humanDesc = translateCron(cron);
        const guruLink = `[Crontab Guru](https://crontab.guru/#${cron.replace(/ /g, '_')})`;
        
        report += `| ${name} | \`${cron}\` | ${humanDesc} | ${guruLink} |\n`;
    }
});

// Simpan ke file markdown
fs.writeFileSync('./mini/workflow-list.md', report);
console.log("✅ Laporan jadwal berhasil diperbarui di mini/workflow-list.md");
