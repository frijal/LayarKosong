import { $ } from 'bun';

const steps = [
    { name: 'srcset.ts', label: '🖼️  Optimasi Gambar & Srcset' },
    { name: 'diet.ts',   label: '🚀 Build Site & Generate Feed' },
];

console.log('════════════════════════════════════════');
console.log('       🏗️  LAYAR KOSONG — FULL BUILD      ');
console.log('════════════════════════════════════════\n');

const startTotal = performance.now();

for (const step of steps) {
    console.log(`▶  ${step.label}`);
    console.log('────────────────────────────────────────');

    const start = performance.now();

    try {
        // Jalankan tiap script secara blocking (berurutan)
        await $`bun run ${import.meta.dir}/${step.name}`;

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        console.log(`\n✅ Selesai dalam ${elapsed}s\n`);

    } catch (err: any) {
        console.error(`\n❌ GAGAL pada ${step.name}:`);
        console.error(err?.message ?? err);
        console.error('\n⛔ Build dihentikan. Perbaiki error di atas dulu.\n');
        process.exit(1);
    }
}

const totalElapsed = ((performance.now() - startTotal) / 1000).toFixed(2);
console.log('════════════════════════════════════════');
console.log(`🎉 FULL BUILD SELESAI dalam ${totalElapsed}s`);
console.log('════════════════════════════════════════\n');