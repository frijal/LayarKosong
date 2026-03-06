<?php
$sourceDir = __DIR__ . '/content';
$targetDir = __DIR__ . '/content/english';

echo "--- Memulai Penerjemahan ---\n";

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir));
foreach ($files as $file) {
    // Hanya proses file .md dan hindari folder 'english' (supaya tidak looping)
    if ($file->getExtension() === 'md' && !str_contains($file->getPathname(), '/english')) {
        echo "Menerjemahkan: " . $file->getFilename() . "...\n";
        $content = file_get_contents($file->getPathname());
        
        $ch = curl_init('http://localhost:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'mistral:latest',
            'prompt' => "Translate the following Markdown content to English. Maintain the original Markdown structure and formatting:\n\n" . $content,
            'stream' => false
        ]));
        
        $result = curl_exec($ch);
        if(curl_errno($ch)) {
            echo "Error Curl: " . curl_error($ch) . "\n";
        } else {
            $response = json_decode($result, true);
            $dest = str_replace('/content/', '/content/english/', $file->getPathname());
            @mkdir(dirname($dest), 0777, true);
            file_put_contents($dest, $response['response'] ?? "Error: Gagal memproses");
            echo "Berhasil disimpan di: $dest\n";
        }
        curl_close($ch);
    }
}
echo "--- Selesai! ---\n";
?>
