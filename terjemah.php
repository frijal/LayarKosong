<?php
$sourceDir = __DIR__ . '/content';
$targetDir = __DIR__ . '/content/english';

echo "--- Memulai Penerjemahan (Mode Strict Markdown) ---\n";

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir));
foreach ($iterator as $file) {
    if ($file->getExtension() === 'md' && !str_contains($file->getPathname(), '/english')) {
        echo "Menerjemahkan: " . $file->getFilename() . "...\n";
        
        $content = file_get_contents($file->getPathname());
        
        // Prompt yang jauh lebih 'galak' untuk mempertahankan simbol Markdown
        $prompt = "TASK: Translate the following text to English.
        RULES:
        1. Keep ALL Markdown symbols exactly as they are (#, ##, ###, **, *, >, -, [ ] ( )).
        2. Do NOT remove the '#' symbols from headings.
        3. Do NOT remove the '**' symbols from bold text.
        4. Maintain the exact line breaks and spacing.
        5. Output ONLY the translated Markdown.

        TEXT TO TRANSLATE:
        " . $content;

        $ch = curl_init('http://localhost:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'mistral:latest',
            'prompt' => $prompt,
            'stream' => false,
            'options' => [
                'temperature' => 0.0, // Set ke nol mutlak untuk konsistensi maksimal
                'top_p' => 0.1
            ]
        ]));
        
        $result = curl_exec($ch);
        $response = json_decode($result, true);
        curl_close($ch);
        
        if (isset($response['response'])) {
            $dest = str_replace('/content/', '/content/english/', $file->getPathname());
            @mkdir(dirname($dest), 0777, true);
            file_put_contents($dest, trim($response['response']));
            echo "Sukses disimpan ke: $dest\n";
        }
    }
}
echo "--- Selesai! ---\n";
