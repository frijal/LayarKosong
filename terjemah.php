<?php
$sourceDir = __DIR__ . '/content';
$targetDir = __DIR__ . '/content/english';

echo "--- Memulai Penerjemahan dengan Mode Pro ---\n";

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir));
foreach ($iterator as $file) {
    if ($file->getExtension() === 'md' && !str_contains($file->getPathname(), '/english')) {
        echo "Menerjemahkan: " . $file->getFilename() . "...\n";
        
        $content = file_get_contents($file->getPathname());
        
        $prompt = "You are a professional translator. Translate the following Markdown text into English. 
        CRITICAL RULES:
        1. Translate ALL text content, including headings, list items, and paragraph text.
        2. DO NOT translate technical identifiers or image filenames.
        3. Keep all Markdown syntax (hashes, bold, italics, code blocks, links) exactly as they are.
        4. Output ONLY the translated English text. No intro, no conversational filler.
        
        Text to translate:
        " . $content;

        $ch = curl_init('http://localhost:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'mistral:latest',
            'prompt' => $prompt,
            'stream' => false
        ]));
        
        $result = curl_exec($ch);
        $response = json_decode($result, true);
        curl_close($ch);
        
        if (isset($response['response'])) {
            $dest = str_replace('/content/', '/content/english/', $file->getPathname());
            @mkdir(dirname($dest), 0777, true);
            file_put_contents($dest, $response['response']);
            echo "Sukses disimpan ke: $dest\n";
        }
    }
}
echo "--- Selesai! ---\n";
