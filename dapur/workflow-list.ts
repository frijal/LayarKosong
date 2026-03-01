import { file as bunFile, write, readdirSync, existsSync } from "bun";
import path from "node:path";

// ========== CONFIG ==========
const WORKFLOW_DIR = './.github/workflows';
const OUTPUT_FILE = './mini/workflow-list.md';

interface WorkflowStats {
    name: string;
    cron: string;
    humanDesc: string;
}

/**
 * Menerjemahkan format CRON ke bahasa manusia (Indonesian)
 */
function translateCron(cron: string): string {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) return "Format tidak valid";

    const [min, hour, dom, mon, dow] = parts;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    // Preset Khusus (WITA = UTC + 8)
    if (cron === '0 0 * * *') return "Setiap tengah malam (08:00 WITA)";
    if (cron === '0 1 * * *') return "Setiap subuh pukul 09:00 WITA";
    if (cron === '0 17 * * *') return "Setiap jam 01:00 dini hari WITA";

    let desc = "Setiap ";

    if (min === '*' && hour === '*') desc += "menit";
    else if (hour === '*' && min !== '*') desc += `menit ke-${min}`;
    else if (hour !== '*' && min !== '*') {
        const hWita = (parseInt(hour) + 8) % 24;
        desc += `pukul ${hWita.toString().padStart(2, '0')}:${min.padStart(2, '0')} WITA`;
    }

    if (dom !== '*') desc += `, tanggal ${dom}`;
    if (mon !== '*') desc += `, bulan ke-${mon}`;

    if (dow !== '*') {
        const dayNames = dow.split(',').map(d => days[parseInt(d)] || d).join(', ');
        desc += `, hari ${dayNames}`;
    }

    return desc;
}

async function generateDashboard() {
    console.log("🔍 Memindai GitHub Workflows (Balikpapan Time Mode)...");

    if (!existsSync(WORKFLOW_DIR)) {
        console.error(`❌ Folder ${WORKFLOW_DIR} tidak ditemukan!`);
        return;
    }

    const files = readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    const results: WorkflowStats[] = [];

    for (const fileName of files) {
        const filePath = path.join(WORKFLOW_DIR, fileName);
        const content = await bunFile(filePath).text();

        // Regex untuk ambil name dan cron
        const nameMatch = content.match(/^name:\s*(.+)/m);
        const cronMatch = content.match(/cron:\s*['"]?([^'#\n\r"']+)['"]?/);

        if (cronMatch) {
            const name = nameMatch ? nameMatch[1].replace(/['"]/g, '').trim() : fileName;
            const cron = cronMatch[1].trim();
            results.push({
                name,
                cron,
                humanDesc: translateCron(cron)
            });
        }
    }

    // Build Laporan Markdown
    let report = "# 🗓️ Dashboard Jadwal Otomatis Layar Kosong\n\n";
    report += `> **Terakhir Diperbarui:** ${new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        dateStyle: 'full',
        timeStyle: 'long'
    })}\n\n`;
    report += "| 🛠️ Nama Workflow | ⏰ Cron (UTC) | 📖 Jadwal Lokal (Balikpapan) |\n";
    report += "| :--- | :--- | :--- |\n";

    results.forEach(res => {
        report += `| ${res.name} | \`${res.cron}\` | ${res.humanDesc} |\n`;
    });

    // Simpan menggunakan Bun.write
    await write(OUTPUT_FILE, report);
    console.log(`✅ Dashboard diperbarui: ${OUTPUT_FILE}`);
}

generateDashboard();
