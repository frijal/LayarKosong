// dashboard-launcher.ts
// Jalankan dengan:
// bun run dashboard-launcher.ts
//
// Buka:
// http://localhost:4999

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

type ScriptItem = {
    id: string;
    title: string;
    description: string;
    file: string;
    dangerLevel: "normal" | "warning" | "danger";
};

type PortProcessInfo = {
    port: number;
    busy: boolean;
    source: "lsof" | "ss" | "fallback" | "unknown";
    raw: string;
    pids: number[];
};

const LAUNCHER_HOST = "localhost";
const LAUNCHER_PORT = 4999;

const SCRIPT_HOST = "localhost";
const SCRIPT_PORT = 5000;

const SCRIPT_DIR = import.meta.dir;

const scripts: ScriptItem[] = [
    {
        id: "adsense-safety-audit",
        title: "AdSense Safety Audit",
        description: "Dashboard cari/ganti teks HTML berbasis Cheerio, lengkap dengan impor CSV dan restore backup.",
        file: "0-audit-txt.ts",
        dangerLevel: "warning"
    },
{
    id: "file-hunter-destroyer",
    title: "File Hunter & Destroyer",
    description: "Mencari file berdasarkan kata kunci lalu menghapus file terpilih secara permanen.",
    file: "0-cari-hapus.ts",
    dangerLevel: "danger"
},
{
    id: "mass-html-duplicate-cleaner",
    title: "Mass HTML Duplicate Cleaner",
    description: "Scan duplikasi potongan HTML di banyak file, lalu hapus duplikat yang tidak dipilih.",
    file: "0-dup-finder.ts",
    dangerLevel: "warning"
},
{
    id: "dynamic-html-cleaner",
    title: "Dynamic HTML Cleaner",
    description: "Scan komponen HTML dalam satu file, lalu hapus elemen yang checkbox-nya dinonaktifkan.",
    file: "0-komp-editor.ts",
    dangerLevel: "warning"
}
];

let activeProcess: ReturnType<typeof Bun.spawn> | null = null;
let activeScript: ScriptItem | null = null;
let activeStartedAt: Date | null = null;

function escapeHtml(value: string): string {
    return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function findScript(id: string): ScriptItem | undefined {
    return scripts.find((script) => script.id === id);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function runShellCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = Bun.spawn(["bash", "-lc", command], {
        cwd: SCRIPT_DIR,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore"
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode
    };
}

function parsePidsFromLsof(raw: string): number[] {
    const pids = new Set<number>();
    const lines = raw.split(/\r?\n/).slice(1);

    for (const line of lines) {
        const cols = line.trim().split(/\s+/);
        const pid = Number(cols[1]);

        if (Number.isInteger(pid) && pid > 0) {
            pids.add(pid);
        }
    }

    return Array.from(pids);
}

function parsePidsFromSs(raw: string): number[] {
    const pids = new Set<number>();
    const regex = /pid=(\d+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
        const pid = Number(match[1]);

        if (Number.isInteger(pid) && pid > 0) {
            pids.add(pid);
        }
    }

    return Array.from(pids);
}

async function detectPortProcess(port: number): Promise<PortProcessInfo> {
    const command = `
    if command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:${port} -sTCP:LISTEN || true
        elif command -v ss >/dev/null 2>&1; then
        ss -ltnp 'sport = :${port}' || true
        else
            echo "__NO_LSOF_OR_SS__"
            fi
            `;

        try {
            const result = await runShellCommand(command);
            const rawCombined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

            if (rawCombined.includes("__NO_LSOF_OR_SS__")) {
                if (port === LAUNCHER_PORT) {
                    return {
                        port,
                        busy: true,
                        source: "fallback",
                        raw: `Tool lsof/ss tidak ditemukan. Karena dashboard ini sedang terbuka, port ${port} dianggap aktif oleh proses launcher saat ini.\nPID launcher: ${process.pid}`,
                        pids: [process.pid]
                    };
                }

                return {
                    port,
                    busy: false,
                    source: "unknown",
                    raw: "Tool lsof/ss tidak ditemukan, jadi proses pemakai port tidak bisa dibaca otomatis.",
                    pids: []
                };
            }

            if (!rawCombined) {
                return {
                    port,
                    busy: false,
                    source: "unknown",
                    raw: `Tidak ada proses yang listen di port ${port}.`,
                    pids: []
                };
            }

            const isLsof = rawCombined.startsWith("COMMAND");
            const isSs = rawCombined.includes("LISTEN") || rawCombined.includes("users:");

            const pids = isLsof ? parsePidsFromLsof(rawCombined) : parsePidsFromSs(rawCombined);

            return {
                port,
                busy: pids.length > 0 || rawCombined.includes(`:${port}`) || rawCombined.includes("LISTEN"),
                source: isLsof ? "lsof" : isSs ? "ss" : "unknown",
                raw: rawCombined,
                pids
            };
        } catch (error) {
            return {
                port,
                busy: false,
                source: "unknown",
                raw: error instanceof Error ? error.message : String(error),
                pids: []
            };
        }
}

async function stopActiveProcess(): Promise<void> {
    if (!activeProcess) return;

    try {
        activeProcess.kill("SIGTERM");

        const timeout = new Promise<null>((resolveTimeout) => {
            setTimeout(() => resolveTimeout(null), 1500);
        });

        await Promise.race([
            activeProcess.exited.catch(() => null),
                           timeout
        ]);

        try {
            activeProcess.kill("SIGKILL");
        } catch {
            // Proses mungkin sudah mati. Aman diabaikan.
        }
    } catch {
        // Abaikan agar launcher tetap hidup.
    } finally {
        activeProcess = null;
        activeScript = null;
        activeStartedAt = null;
    }
}

async function stopPortProcess(port: number): Promise<{ ok: boolean; message: string; raw: string }> {
    if (port === LAUNCHER_PORT) {
        return {
            ok: false,
            message: "Port launcher tidak dimatikan lewat fungsi ini. Gunakan endpoint /off/4999 agar response sempat dikirim ke browser.",
            raw: ""
        };
    }

    if (port === SCRIPT_PORT && activeProcess) {
        await stopActiveProcess();
    }

    let info = await detectPortProcess(port);

    if (!info.busy) {
        return {
            ok: true,
            message: `Port ${port} sudah kosong.`,
            raw: info.raw
        };
    }

    const safePids = info.pids.filter((pid) => pid !== process.pid);

    if (safePids.length === 0) {
        return {
            ok: false,
            message: `Port ${port} terdeteksi aktif, tetapi PID target tidak ditemukan atau hanya menunjuk ke proses launcher.`,
            raw: info.raw
        };
    }

    for (const pid of safePids) {
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            // Lanjutkan ke PID berikutnya.
        }
    }

    await sleep(900);

    info = await detectPortProcess(port);
    const remainingPids = info.pids.filter((pid) => pid !== process.pid);

    for (const pid of remainingPids) {
        try {
            process.kill(pid, "SIGKILL");
        } catch {
            // Abaikan.
        }
    }

    await sleep(400);

    const finalInfo = await detectPortProcess(port);

    return {
        ok: !finalInfo.busy,
        message: finalInfo.busy
        ? `Port ${port} masih aktif. Kemungkinan proses tidak bisa dimatikan dari launcher.`
        : `Port ${port} berhasil dimatikan.`,
        raw: finalInfo.raw
    };
}

async function startScript(script: ScriptItem): Promise<{ ok: boolean; message: string; path?: string }> {
    const scriptPath = resolve(join(SCRIPT_DIR, script.file));

    if (!existsSync(scriptPath)) {
        return {
            ok: false,
            message: `File script tidak ditemukan: ${scriptPath}`,
            path: scriptPath
        };
    }

    await stopPortProcess(SCRIPT_PORT);

    activeProcess = Bun.spawn(["bun", "run", scriptPath], {
        cwd: SCRIPT_DIR,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "ignore"
    });

    activeScript = script;
    activeStartedAt = new Date();

    activeProcess.exited.then(() => {
        if (activeScript?.id === script.id) {
            activeProcess = null;
            activeScript = null;
            activeStartedAt = null;
        }
    }).catch(() => {
        if (activeScript?.id === script.id) {
            activeProcess = null;
            activeScript = null;
            activeStartedAt = null;
        }
    });

    return {
        ok: true,
        message: `${script.title} berhasil dijalankan.`,
        path: scriptPath
    };
}

function renderPortControl(info: PortProcessInfo, label: string, url: string): string {
    const isLauncherPort = info.port === LAUNCHER_PORT;
    const isScriptPort = info.port === SCRIPT_PORT;

    const statusText = info.busy ? "ON" : "OFF";
    const statusClass = info.busy ? "on" : "off";

    const onButton = info.busy
    ? `<a class="button-link on-link" href="${url}" target="_blank" rel="noopener">On / Buka</a>`
    : isScriptPort
    ? `<button type="button" disabled>On / Pilih Script Dulu</button>`
    : `<button type="button" disabled>On</button>`;

    const offButton = info.busy
    ? `
    <form method="post" action="/off/${info.port}">
    <button class="stop" type="submit">Off</button>
    </form>
    `
    : `
    <button type="button" disabled>Off</button>
    `;

    const note = isLauncherPort
    ? "Port ini dipakai oleh dashboard launcher. Tombol Off akan mematikan launcher setelah halaman konfirmasi dikirim."
    : "Port ini dipakai oleh dashboard script target. Tombol Off akan mematikan proses yang listen di port 5000.";

    return `
    <article class="port-card ${statusClass}">
    <div class="port-head">
    <h2>${escapeHtml(label)}</h2>
    <span class="status-pill ${statusClass}">${statusText}</span>
    </div>
    <p>Alamat: <a href="${url}" target="_blank" rel="noopener">${url}</a></p>
    <p>${escapeHtml(note)}</p>
    <div class="port-actions">
    ${onButton}
    ${offButton}
    </div>
    <details class="port-details">
    <summary>Detail proses port ${info.port}</summary>
    <pre>${escapeHtml(info.raw)}</pre>
    </details>
    </article>
    `;
}

async function renderHome(): Promise<Response> {
    const launcherPortInfo = await detectPortProcess(LAUNCHER_PORT);
    const scriptPortInfo = await detectPortProcess(SCRIPT_PORT);

    const launcherUrl = `http://${LAUNCHER_HOST}:${LAUNCHER_PORT}/`;
    const scriptUrl = `http://${SCRIPT_HOST}:${SCRIPT_PORT}/`;

    const portControls = `
    <section class="ports-grid">
    ${renderPortControl(launcherPortInfo, `Port ${LAUNCHER_PORT} - Launcher`, launcherUrl)}
    ${renderPortControl(scriptPortInfo, `Port ${SCRIPT_PORT} - Dashboard Script`, scriptUrl)}
    </section>
    `;

    const cards = scripts.map((script) => {
        const scriptPath = resolve(join(SCRIPT_DIR, script.file));
        const exists = existsSync(scriptPath);

        const dangerText =
        script.dangerLevel === "danger"
        ? "Risiko tinggi: bisa menghapus file permanen."
        : script.dangerLevel === "warning"
        ? "Perlu hati-hati: script dapat mengubah file dan membuat backup."
        : "Aman untuk penggunaan normal.";

        return `
        <article class="card ${script.dangerLevel}">
        <div class="card-head">
        <h2>${escapeHtml(script.title)}</h2>
        <span class="badge ${exists ? "ok" : "missing"}">${exists ? "File ditemukan" : "File belum ada"}</span>
        </div>
        <p>${escapeHtml(script.description)}</p>
        <p class="path"><code>${escapeHtml(scriptPath)}</code></p>
        <p class="hint">${escapeHtml(dangerText)}</p>
        <form method="post" action="/start/${encodeURIComponent(script.id)}" target="_blank">
        <button type="submit" ${exists ? "" : "disabled"}>On / Jalankan di Tab Baru</button>
        </form>
        </article>
        `;
    }).join("");

    const activeInfo = activeScript
    ? `
    <section class="active-box">
    <h2>Script Aktif</h2>
    <p><b>${escapeHtml(activeScript.title)}</b></p>
    <p>Mulai: ${escapeHtml(activeStartedAt?.toLocaleString("id-ID") ?? "-")}</p>
    <p>Dashboard aktif: <a href="${scriptUrl}" target="_blank" rel="noopener">${scriptUrl}</a></p>
    <form method="post" action="/off/${SCRIPT_PORT}">
    <button class="stop" type="submit">Off / Matikan Port ${SCRIPT_PORT}</button>
    </form>
    </section>
    `
    : scriptPortInfo.busy
    ? `
    <section class="active-box busy">
    <h2>Script Aktif</h2>
    <p><b>Port ${SCRIPT_PORT} sedang dipakai proses lain.</b></p>
    <p>Launcher tidak selalu tahu nama script-nya, tetapi proses yang listen di port ini terdeteksi.</p>
    <p>Dashboard kemungkinan aktif di: <a href="${scriptUrl}" target="_blank" rel="noopener">${scriptUrl}</a></p>
    <form method="post" action="/off/${SCRIPT_PORT}">
    <button class="stop" type="submit">Off / Matikan Port ${SCRIPT_PORT}</button>
    </form>
    </section>
    `
    : `
    <section class="active-box">
    <h2>Script Aktif</h2>
    <p>Belum ada script yang berjalan dan port ${SCRIPT_PORT} sedang kosong.</p>
    </section>
    `;

    const html = `<!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bun Multi Dashboard Launcher</title>
    <style>
    :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --surface-alt: #eef2f7;
        --text: #172033;
        --muted: #4b5870;
        --heading: #0f172a;
        --border: #cbd5e1;
        --accent: #0b5cad;
        --accent-hover: #084a8a;
        --danger: #b91c1c;
        --danger-bg: #fff1f2;
        --warning: #9a3412;
        --warning-bg: #fff7ed;
        --ok: #0f766e;
        --ok-bg: #ecfdf5;
        --missing: #991b1b;
        --missing-bg: #fee2e2;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            color-scheme: dark;
            --bg: #0d1117;
            --surface: #151b23;
            --surface-alt: #1f2937;
            --text: #e5edf5;
            --muted: #b8c4d6;
            --heading: #f8fafc;
            --border: #334155;
            --accent: #8ec5ff;
            --accent-hover: #b7dcff;
            --danger: #fca5a5;
            --danger-bg: #2d1518;
            --warning: #fdba74;
            --warning-bg: #2d1c12;
            --ok: #5eead4;
            --ok-bg: #102a2a;
            --missing: #fca5a5;
            --missing-bg: #351717;
        }
    }

    * {
        box-sizing: border-box;
    }

    html {
        scroll-behavior: smooth;
    }

    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1.125rem;
        line-height: 1.65;
    }

    main {
        width: min(100%, 72rem);
        margin: 0 auto;
        padding: 1rem;
    }

    header,
    .active-box,
    .card,
    .notice,
    .port-card {
        border: 0.0625rem solid var(--border);
        border-radius: 1rem;
        background: var(--surface);
    }

    header {
        margin: 1rem 0;
        padding: 1.25rem;
    }

    h1,
    h2 {
        color: var(--heading);
        line-height: 1.25;
    }

    h1 {
        margin: 0 0 0.75rem;
        font-size: 2rem;
    }

    h2 {
        margin: 0;
        font-size: 1.35rem;
    }

    p {
        margin: 0.75rem 0 0;
    }

    a {
        color: var(--accent);
        text-decoration-thickness: 0.08rem;
        text-underline-offset: 0.18rem;
    }

    a:hover {
        color: var(--accent-hover);
    }

    code {
        word-break: break-all;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 0.92rem;
    }

    .grid,
    .ports-grid {
        display: grid;
        gap: 1rem;
        margin: 1rem 0;
    }

    .card,
    .port-card {
        padding: 1rem;
    }

    .card.warning {
        border-inline-start: 0.35rem solid var(--warning);
    }

    .card.danger {
        border-inline-start: 0.35rem solid var(--danger);
    }

    .card.normal {
        border-inline-start: 0.35rem solid var(--ok);
    }

    .card-head,
    .port-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }

    .badge,
    .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999rem;
        padding: 0.2rem 0.65rem;
        font-size: 0.85rem;
        font-weight: 700;
        white-space: nowrap;
    }

    .badge.ok,
    .status-pill.on {
        color: var(--ok);
        background: var(--ok-bg);
    }

    .badge.missing,
    .status-pill.off {
        color: var(--missing);
        background: var(--missing-bg);
    }

    .path {
        color: var(--muted);
        background: var(--surface-alt);
        border-radius: 0.65rem;
        padding: 0.65rem;
    }

    .hint {
        color: var(--muted);
        font-size: 0.95rem;
    }

    button,
    .button-link {
        margin-top: 1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.65rem 1rem;
        border: 0;
        border-radius: 0.7rem;
        background: var(--accent);
        color: #ffffff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
    }

    button:hover,
    .button-link:hover {
        background: var(--accent-hover);
        color: #ffffff;
    }

    button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }

    button.stop {
        background: var(--danger);
    }

    button.stop:hover {
        background: #991b1b;
    }

    .port-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
    }

    .port-actions form {
        margin: 0;
    }

    .active-box,
    .notice {
        padding: 1rem;
        margin: 1rem 0;
    }

    .active-box.busy {
        border-inline-start: 0.35rem solid var(--warning);
    }

    .port-card.on {
        border-inline-start: 0.35rem solid var(--ok);
    }

    .port-card.off {
        border-inline-start: 0.35rem solid var(--missing);
    }

    .notice {
        background: var(--warning-bg);
        color: var(--text);
        border-inline-start: 0.35rem solid var(--warning);
    }

    .port-details {
        margin-top: 1rem;
    }

    .port-details summary {
        cursor: pointer;
        color: var(--heading);
        font-weight: 700;
    }

    .port-details pre {
        margin: 0.75rem 0 0;
        padding: 0.85rem;
        overflow-x: auto;
        white-space: pre-wrap;
        border-radius: 0.75rem;
        background: var(--surface-alt);
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 0.9rem;
    }

    @media (min-width: 48rem) {
        main {
            padding: 2rem;
        }

        h1 {
            font-size: 2.4rem;
        }

        .grid,
        .ports-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
    </style>
    </head>
    <body>
    <main>
    <header>
    <h1>Bun Multi Dashboard Launcher</h1>
    <p>Satu halaman pemicu untuk menjalankan 4 dashboard Bun. Setiap tombol membuka tab baru. Karena semua script memakai port <code>${SCRIPT_PORT}</code>, launcher akan mematikan proses di port tersebut sebelum menjalankan script lain.</p>
    </header>

    <section class="notice">
    <p><b>Perhatian:</b> beberapa script dapat mengubah atau menghapus file. Pastikan folder proyek sudah aman, idealnya dalam kondisi bersih di Git sebelum menjalankan proses.</p>
    </section>

    ${portControls}

    ${activeInfo}

    <section class="grid">
    ${cards}
    </section>
    </main>
    </body>
    </html>`;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
        }
    });
}

function renderStartingPage(script: ScriptItem, result: { ok: boolean; message: string; path?: string }): Response {
    const targetUrl = `http://${SCRIPT_HOST}:${SCRIPT_PORT}/`;

    const refresh = result.ok
    ? `<meta http-equiv="refresh" content="1.2; url=${targetUrl}">`
    : "";

    const statusClass = result.ok ? "ok" : "fail";

    const html = `<!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${refresh}
    <title>${escapeHtml(script.title)} - Launcher</title>
    <style>
    :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --text: #172033;
        --muted: #4b5870;
        --heading: #0f172a;
        --border: #cbd5e1;
        --ok: #0f766e;
        --fail: #b91c1c;
        --accent: #0b5cad;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            color-scheme: dark;
            --bg: #0d1117;
            --surface: #151b23;
            --text: #e5edf5;
            --muted: #b8c4d6;
            --heading: #f8fafc;
            --border: #334155;
            --ok: #5eead4;
            --fail: #fca5a5;
            --accent: #8ec5ff;
        }
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1.125rem;
        line-height: 1.65;
    }

    main {
        width: min(100%, 48rem);
        margin: 0 auto;
        padding: 1rem;
    }

    section {
        margin: 2rem 0;
        padding: 1.25rem;
        border: 0.0625rem solid var(--border);
        border-radius: 1rem;
        background: var(--surface);
    }

    h1 {
        margin: 0 0 1rem;
        color: var(--heading);
        font-size: 2rem;
        line-height: 1.25;
    }

    p {
        margin: 0.75rem 0 0;
    }

    code {
        word-break: break-all;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    }

    a {
        color: var(--accent);
    }

    .ok {
        color: var(--ok);
        font-weight: 700;
    }

    .fail {
        color: var(--fail);
        font-weight: 700;
    }
    </style>
    </head>
    <body>
    <main>
    <section>
    <h1>${escapeHtml(script.title)}</h1>
    <p class="${statusClass}">${escapeHtml(result.message)}</p>
    ${result.path ? `<p>Path: <code>${escapeHtml(result.path)}</code></p>` : ""}
    ${
        result.ok
        ? `<p>Dashboard akan dibuka otomatis. Jika tidak berpindah, buka manual: <a href="${targetUrl}">${targetUrl}</a></p>`
        : `<p>Kembali ke tab launcher, perbaiki nama file/path, lalu coba lagi.</p>`
    }
    </section>
    </main>
    </body>
    </html>`;

    return new Response(html, {
        status: result.ok ? 200 : 404,
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
        }
    });
}

function renderOffLauncherPage(): Response {
    const html = `<!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Launcher Dimatikan</title>
    <style>
    :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --text: #172033;
        --muted: #4b5870;
        --heading: #0f172a;
        --border: #cbd5e1;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            color-scheme: dark;
            --bg: #0d1117;
            --surface: #151b23;
            --text: #e5edf5;
            --muted: #b8c4d6;
            --heading: #f8fafc;
            --border: #334155;
        }
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1.125rem;
        line-height: 1.65;
    }

    main {
        width: min(100%, 44rem);
        margin: 0 auto;
        padding: 1rem;
    }

    section {
        margin: 2rem 0;
        padding: 1.25rem;
        border: 0.0625rem solid var(--border);
        border-radius: 1rem;
        background: var(--surface);
    }

    h1 {
        margin: 0 0 1rem;
        color: var(--heading);
        font-size: 2rem;
    }
    </style>
    </head>
    <body>
    <main>
    <section>
    <h1>Launcher Dimatikan</h1>
    <p>Port ${LAUNCHER_PORT} akan OFF. Tab ini tidak perlu di-refresh.</p>
    <p>Jika port ${SCRIPT_PORT} masih ON, matikan dari terminal atau jalankan ulang launcher lalu tekan tombol Off untuk port ${SCRIPT_PORT}.</p>
    </section>
    </main>
    </body>
    </html>`;

    setTimeout(() => {
        process.exit(0);
    }, 250);

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
        }
    });
}

function renderPortOffResult(port: number, result: { ok: boolean; message: string; raw: string }): Response {
    const html = `<!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="1.2; url=/">
    <title>Port ${port} Off</title>
    <style>
    :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --text: #172033;
        --heading: #0f172a;
        --border: #cbd5e1;
        --ok: #0f766e;
        --fail: #b91c1c;
        --surface-alt: #eef2f7;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            color-scheme: dark;
            --bg: #0d1117;
            --surface: #151b23;
            --text: #e5edf5;
            --heading: #f8fafc;
            --border: #334155;
            --ok: #5eead4;
            --fail: #fca5a5;
            --surface-alt: #1f2937;
        }
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1.125rem;
        line-height: 1.65;
    }

    main {
        width: min(100%, 48rem);
        margin: 0 auto;
        padding: 1rem;
    }

    section {
        margin: 2rem 0;
        padding: 1.25rem;
        border: 0.0625rem solid var(--border);
        border-radius: 1rem;
        background: var(--surface);
    }

    h1 {
        margin: 0 0 1rem;
        color: var(--heading);
        font-size: 2rem;
    }

    .ok {
        color: var(--ok);
        font-weight: 700;
    }

    .fail {
        color: var(--fail);
        font-weight: 700;
    }

    pre {
        margin: 1rem 0 0;
        padding: 0.85rem;
        overflow-x: auto;
        white-space: pre-wrap;
        border-radius: 0.75rem;
        background: var(--surface-alt);
    }
    </style>
    </head>
    <body>
    <main>
    <section>
    <h1>Port ${port}</h1>
    <p class="${result.ok ? "ok" : "fail"}">${escapeHtml(result.message)}</p>
    <p>Halaman akan kembali ke launcher otomatis.</p>
    <pre>${escapeHtml(result.raw)}</pre>
    </section>
    </main>
    </body>
    </html>`;

    return new Response(html, {
        status: result.ok ? 200 : 500,
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
        }
    });
}

function renderNotFound(): Response {
    return new Response("Not Found", {
        status: 404,
        headers: {
            "Content-Type": "text/plain; charset=UTF-8"
        }
    });
}

Bun.serve({
    hostname: LAUNCHER_HOST,
    port: LAUNCHER_PORT,

    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
            return await renderHome();
        }

        if (url.pathname.startsWith("/start/") && request.method === "POST") {
            const id = decodeURIComponent(url.pathname.replace("/start/", ""));
            const script = findScript(id);

            if (!script) {
                return renderNotFound();
            }

            const result = await startScript(script);
            return renderStartingPage(script, result);
        }

        if (url.pathname === "/stop" && request.method === "POST") {
            const result = await stopPortProcess(SCRIPT_PORT);
            return renderPortOffResult(SCRIPT_PORT, result);
        }

        if (url.pathname === `/off/${SCRIPT_PORT}` && request.method === "POST") {
            const result = await stopPortProcess(SCRIPT_PORT);
            return renderPortOffResult(SCRIPT_PORT, result);
        }

        if (url.pathname === `/off/${LAUNCHER_PORT}` && request.method === "POST") {
            return renderOffLauncherPage();
        }

        if (url.pathname === "/status" && request.method === "GET") {
            const launcherPortInfo = await detectPortProcess(LAUNCHER_PORT);
            const scriptPortInfo = await detectPortProcess(SCRIPT_PORT);

            return Response.json({
                launcher: {
                    host: LAUNCHER_HOST,
                    port: LAUNCHER_PORT,
                    url: `http://${LAUNCHER_HOST}:${LAUNCHER_PORT}/`,
                    portInfo: launcherPortInfo
                },
                script: {
                    host: SCRIPT_HOST,
                    port: SCRIPT_PORT,
                    url: `http://${SCRIPT_HOST}:${SCRIPT_PORT}/`,
                    active: activeScript
                    ? {
                        id: activeScript.id,
                        title: activeScript.title,
                        startedAt: activeStartedAt?.toISOString() ?? null
                    }
                    : null,
                    portInfo: scriptPortInfo
                }
            });
        }

        return renderNotFound();
    }
});

console.log(`🚀 Bun Multi Dashboard Launcher aktif di http://${LAUNCHER_HOST}:${LAUNCHER_PORT}/`);
console.log(`📌 Dashboard script target akan berjalan di http://${SCRIPT_HOST}:${SCRIPT_PORT}/`);
console.log(`📂 Folder script: ${SCRIPT_DIR}`);
