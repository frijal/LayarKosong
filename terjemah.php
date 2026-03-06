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
            'prompt' => "You are a professional translator. Translate the following Markdown text into English. 
CRITICAL RULES:
1. Translate all content inside the Markdown, including headings, lists, and paragraphs.
2. Keep all Markdown syntax (hashes, bold, italics, code blocks, links) exactly as they are.
3. Do not omit any part of the text.
4. Output only the translated English text, no conversational filler.

Text to translate:
" . $content,
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
