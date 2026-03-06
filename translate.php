<?php
$sourceDir = __DIR__ . '/content';
$targetDir = __DIR__ . '/content/english';

// Pastikan folder target ada
if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir)) as $file) {
    if ($file->getExtension() === 'md' && !str_contains($file->getPathname(), '/english')) {
        echo "Memproses: " . $file->getFilename() . "...\n";
        $content = file_get_contents($file->getPathname());
        
        $ch = curl_init('http://localhost:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'mistral:latest',
            'prompt' => "Translate the following Markdown to English, keep the structure: \n" . $content,
            'stream' => false
        ]));
        
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);
        
        $outputPath = str_replace('/content/', '/content/english/', $file->getPathname());
        if (!is_dir(dirname($outputPath))) mkdir(dirname($outputPath), 0777, true);
        file_put_contents($outputPath, $response['response'] ?? "Error: Gagal memproses");
        echo "Berhasil disimpan di: $outputPath\n";
    }
}
?>
