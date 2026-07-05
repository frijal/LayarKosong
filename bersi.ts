import { readFileSync, writeFileSync } from "fs";

console.log("🧹 Memulai sapu ranjau kutip tunggal...");

try {
    const file = readFileSync("migrasi.sql", "utf8");
    const lines = file.split("\n");
    let count = 0;

    const safeLines = lines.map(line => {
        // Cari pola VALUES ('/path', angka, angka)
        const match = line.match(/VALUES \('(.*)', (\d+), (\d+)\) ON CONFLICT/);
        if (match) {
            let path = match[1];
            // Kalau ada kutip tunggal ('), gandakan jadi ('') agar SQL tidak error
            if (path.includes("'")) {
                path = path.replace(/'/g, "''");
                count++;
            }
            return line.replace(/VALUES \('(.*)', (\d+), (\d+)\) ON CONFLICT/, `VALUES ('${path}', $2, $3) ON CONFLICT`);
        }
        return line;
    });

    writeFileSync("migrasi.sql", safeLines.join("\n"));
    console.log(`✅ Selesai! Ada ${count} URL yang disterilkan dari kutip tunggal.`);
    console.log(`📊 Total query siap eksekusi: ${safeLines.length}`);
} catch (err) {
    console.error("❌ Waduh, error:", err);
}
