<?php
echo "Halo! Skrip berjalan di: " . __DIR__ . "\n";
$dir = __DIR__ . '/content';
if (is_dir($dir)) {
    echo "Folder 'content' ditemukan. Memindai...\n";
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($files as $file) {
        if ($file->isFile() && $file->getExtension() === 'md') {
            echo "Ditemukan file: " . $file->getPathname() . "\n";
        }
    }
} else {
    echo "Error: Folder 'content' tidak ada di lokasi ini!\n";
}
?>
