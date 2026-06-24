async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian dapur gambar (Mode: Informasi Kaya + Counter)...");

    // Scan murni file gambar saja
    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: ROOT_IMG_DIR,
        nodir: true,
        nocase: true
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // Langkah 1: Pilah varian thumbnail agar tidak mengotori list utama
    allFiles.forEach(file => {
        const ext = extname(file);
        const nameWithoutExt = basename(file, ext);
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(file);
        }
    });

    // Langkah 2: Ekstrak file utama & kumpulkan metadatanya
    for (const file of allFiles) {
        if (processedThumbnails.has(file)) continue;

        const fullPath = join(ROOT_IMG_DIR, file);
        const stats = statSync(fullPath);
        const filename = basename(file);
        const fileExt = extname(file).toLowerCase();

        const relDir = dirname(file);
        const pathKey = relDir === "." ? "root" : relDir;

        if (!galleryMap[pathKey]) {
            galleryMap[pathKey] = [];
        }

        const nameWithoutExt = basename(file, fileExt);
        const potentialThumb = join(relDir, `${nameWithoutExt}-sm${fileExt}`);
        const hasThumb = allFiles.includes(potentialThumb.replace(/\\/g, "/"));

        let fileData: FileItem = {
            name: filename,
            path: file,
            thumbPath: hasThumb ? potentialThumb.replace(/\\/g, "/") : null,
            size: stats.size,
            date: formatDate(stats.mtime),
            type: "file"
        };

        if (fileExt !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();
                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
            } catch (err) {
                console.warn(`⚠️ Gagal membaca metadata Sharp untuk berkas: ${file}`);
            }
        } else {
            fileData.format = "svg";
            fileData.width = 0;
            fileData.height = 0;
        }

        galleryMap[pathKey].push(fileData);

        // Langkah 3: Rekonstruksi navigasi folder tiruan Apache
        if (pathKey !== "root") {
            const parts = pathKey.split("/");
            let currentBuildPath = "";

            for (let i = 0; i < parts.length; i++) {
                const parentKey = i === 0 ? "root" : currentBuildPath;
                const dirName = parts[i];
                currentBuildPath = currentBuildPath ? `${currentBuildPath}/${dirName}` : dirName;

                if (!galleryMap[parentKey]) galleryMap[parentKey] = [];

                const isDirExist = galleryMap[parentKey].some(
                    item => item.type === "dir" && item.path === currentBuildPath
                );

                if (!isDirExist) {
                    galleryMap[parentKey].unshift({
                        name: dirName,
                        path: currentBuildPath,
                        type: "dir",
                        directFiles: 0, // Nilai inisialisasi awal
                        totalFiles: 0   // Nilai inisialisasi awal
                    });
                }
            }
        }
    }

    // 🔥 LANGKAH BARU: Hitung isi gambar menggunakan data allFiles mentah
    // Menyaring list berkas bersih yang bukan berkas thumbnail-sm atau md
    const cleanFilesList = allFiles.filter(file => !processedThumbnails.has(file));

    // Iterasi setiap folder yang ada di map untuk menghitung jumlah gambarnya
    Object.keys(galleryMap).forEach(folderPath => {
        galleryMap[folderPath].forEach(item => {
            if (item.type === "dir") {
                const targetDir = item.path; // contoh: "folderA" atau "folderA/folderA1"

                // 1. Direct count: Berkas yang berada langsung di dalam folder tersebut
                item.directFiles = cleanFilesList.filter(file => dirname(file) === targetDir).length;

                // 2. Recursive/Total count: Berkas yang diawali oleh jalur folder tersebut (termasuk sub-foldernya)
                item.totalFiles = cleanFilesList.filter(file => 
                    file.startsWith(targetDir + "/") || dirname(file) === targetDir
                ).length;
            }
        });
    });

    // Langkah 4: Tulis data mentah ke berkas target
    try {
        const prettyJson = JSON.stringify(galleryMap, null, 2);
        writeFileSync(OUTPUT_JSON, prettyJson, "utf-8");
        
        console.log(`\n✨ SUKSES! Berkas galeri berhasil disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder teregistrasi: ${Object.keys(galleryMap).length} lokasi.`);
    } catch (writeErr) {
        console.error("❌ Gagal menulis berkas galeri-data.json:", writeErr);
    }
}
