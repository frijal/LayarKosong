import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import path from "node:path";

// ========== CONFIG ==========
const WORKFLOW_DIR = "./.github/workflows";
const OUTPUT_FILE = "./mini/workflow-list.md";

interface WorkflowStats {
    name: string;
    cron: string;
    humanDesc: string;
    witaHour: number;
    witaMin: number;
}

/**
 * Menerjemahkan format CRON ke bahasa manusia (Indonesian)
 * Fokus pada kejelasan waktu Balikpapan (WITA)
 */
function translateCron(cron: string): string {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) return "Format tidak valid";

    const [min, hour, dom, mon, dow] = parts;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    let desc = "Setiap ";

    // 1. Logika Jam & Menit (Konversi ke WITA)
    if (hour.includes("/") || hour === "*") {
        // Handle interval (misal */4)
        const interval = hour.split("/")[1] || "1";
        desc += `pukul ${min.padStart(2, "0")}:00 (Interval ${interval} jam)`;
    } else {
        // Handle jam spesifik atau list jam (misal 2,6,10)
        const hoursWita = hour.split(",")
        .map(h => (parseInt(h, 10) + 8) % 24)
        .sort((a, b) => a - b)
        .map(h => h.toString().padStart(2, "0") + ":" + min.padStart(2, "0"));

        desc += `pukul ${hoursWita.join(", ")} WITA`;
    }

    // 2. Tanggal (Day of Month)
    if (dom !== "*") {
        desc += dom.includes("/")
        ? `, setiap ${dom.split("/")[1]} hari`
        : `, tanggal ${dom}`;
    }

    // 3. Bulan
    if (mon !== "*") {
        desc += `, bulan ke-${mon}`;
    }

    // 4. Hari (Day of Week)
    if (dow !== "*") {
        const dayNames = dow
        .split(",")
        .map((d) => days[parseInt(d, 10)] || d)
        .join(", ");
        desc += `, hari ${dayNames}`;
    }

    return desc;
}

/**
 * Parsing jam pertama untuk sorting dashboard
 */
function parseWitaFromCron(cron: string): [number, number] {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) return [0, 0];

    const minStr = parts[0].includes(",") ? parts[0].split(",")[0] : parts[0];
    const hourStr = parts[1].includes(",") ? parts[1].split(",")[0] : parts[1];
    const hourBase = hourStr.includes("/") ? hourStr.split("/")[0] : hourStr;

    const min = parseInt(minStr, 10) || 0;
    const hour = hourBase === "*" ? 0 : parseInt(hourBase, 10) || 0;

    const hWita = (hour + 8) % 24;
    return [hWita, min];
}

async function generateDashboard() {
    console.log("🔍 Memindai GitHub Workflows (Balikpapan Time Mode)...");

    if (!fs.existsSync(WORKFLOW_DIR)) {
        console.error(`❌ Folder ${WORKFLOW_DIR} tidak ditemukan!`);
        return;
    }

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const files = fs
    .readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

    const results: WorkflowStats[] = [];

    for (const fileName of files) {
        const filePath = path.join(WORKFLOW_DIR, fileName);

        try {
            const content = await bunFile(filePath).text();
            const nameMatch = content.match(/^name:\s*(.+)/m);
            // Regex lebih kuat untuk menangkap cron di dalam quotes atau tidak
            const cronMatch = content.match(/cron:\s*['"]?([^'#\n\r"']+)['"]?/);

            if (cronMatch) {
                const name = nameMatch ? nameMatch[1].replace(/['"]/g, "").trim() : fileName;
                const cron = cronMatch[1].trim();
                const [witaHour, witaMin] = parseWitaFromCron(cron);

                results.push({
                    name,
                    cron,
                    humanDesc: translateCron(cron),
                             witaHour,
                             witaMin,
                });
            }
        } catch (e) {
            console.warn(`⚠️ Gagal membaca ${fileName}`);
        }
    }

    // === SORT berdasarkan urutan waktu WITA ===
    results.sort((a, b) => {
        if (a.witaHour !== b.witaHour) return a.witaHour - b.witaHour;
        return a.witaMin - b.witaMin;
    });

    // Build Markdown Report
    let report = "# 🗓️ Dashboard Jadwal Otomatis Layar Kosong\n\n";
    report += `> **Terakhir Diperbarui:** ${new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Makassar",
        dateStyle: "full",
        timeStyle: "long",
    })}\n\n`;

    if (results.length === 0) {
        report += "> ℹ️ Tidak ada workflow dengan schedule ditemukan.\n";
    } else {
        report += "| 🛠️ Nama Workflow | ⏰ Cron (UTC) | 📖 Jadwal Lokal (Balikpapan) |\n";
        report += "| :--- | :--- | :--- |\n";

        for (const res of results) {
            report += `| ${res.name} | \`${res.cron}\` | ${res.humanDesc} |\n`;
        }

        report += "\n---\n*Dashboard ini dibuat otomatis oleh robot dapur.*";
    }

    await write(OUTPUT_FILE, report);
    console.log(`✅ Laporan dashboard berhasil dibuat di: ${OUTPUT_FILE}`);
}

generateDashboard();