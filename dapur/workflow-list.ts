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
    witaHour: number; // untuk sorting
    witaMin: number;  // untuk sorting
}

/**
 * Menerjemahkan format CRON ke bahasa manusia (Indonesian)
 */
function translateCron(cron: string): string {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) return "Format tidak valid";

    const [min, hour, dom, mon, dow] = parts;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    // Preset khusus (UTC → WITA)
    if (cron === "0 0 * * *") return "Setiap pukul 08:00 WITA";
    if (cron === "0 1 * * *") return "Setiap pukul 09:00 WITA";
    if (cron === "0 17 * * *") return "Setiap pukul 01:00 dini hari WITA";

    let desc = "Setiap ";

    if (min === "*" && hour === "*") {
        desc += "menit";
    } else if (hour === "*" && min !== "*") {
        desc += `menit ke-${min}`;
    } else if (hour !== "*" && min !== "*") {
        const hWita = (parseInt(hour, 10) + 8) % 24;
        desc += `pukul ${hWita.toString().padStart(2, "0")}:${min.padStart(2, "0")} WITA`;
    }

    if (dom !== "*") desc += `, tanggal ${dom}`;
    if (mon !== "*") desc += `, bulan ke-${mon}`;

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
 * Ambil jam & menit WITA dari cron
 */
function parseWitaFromCron(cron: string): [number, number] {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) return [0, 0];
    const min = parseInt(parts[0], 10) || 0;
    const hour = parseInt(parts[1], 10) || 0;
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
        } catch {
            console.warn(`⚠️ Gagal membaca ${fileName}`);
        }
    }

    // === SORT berdasarkan jam + menit WITA ===
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
        report += "Tidak ada workflow dengan cron schedule ditemukan.\n";
    } else {
        report += "| 🛠️ Nama Workflow | ⏰ Cron (UTC) | 📖 Jadwal Lokal (Balikpapan) |\n";
        report += "| :--- | :--- | :--- |\n";

        for (const res of results) {
            report += `| ${res.name} | \`${res.cron}\` | ${res.humanDesc} |\n`;
        }
    }

    await write(OUTPUT_FILE, report);
    console.log(`✅ Dashboard diperbarui: ${OUTPUT_FILE}`);
}

generateDashboard();