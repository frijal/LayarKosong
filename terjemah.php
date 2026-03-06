<?php
$sourceDir = __DIR__ . '/content';
$targetDir = __DIR__ . '/content/english';

echo "--- Memulai Penerjemahan Pro (Mode Kaku) ---\n";

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir));
foreach ($iterator as $file) {
    // Hanya proses file .md dan hindari folder 'english' agar tidak loop selamanya
    if ($file->getExtension() === 'md' && !str_contains($file->getPathname(), '/english')) {
        echo "Menerjemahkan: " . $file->getFilename() . "...\n";
        
        $content = file_get_contents($file->getPathname());
        
        // Prompt ini diperkuat agar AI tidak berani meringkas
        $prompt = "You are an expert translator. Translate the following Markdown content to English.
        INSTRUCTIONS:
        1. Translate every single sentence, heading, and list item.
        2. DO NOT summarize or omit any information.
        3. Keep all original Markdown syntax (hashes, bold, links, etc.) exactly as is.
        4. If it's a code block, leave the code as is.
        5. Output ONLY the translated result.
        
        Text to translate:
        " . $content;

        $ch = curl_init('http://localhost:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'mistral:latest',
            'prompt' => $prompt,
            'stream' => false,
            'options' => [
                'temperature' => 0.1 // Memaksa AI bekerja secara logis dan kaku
            ]
        ]));
        
        $result = curl_exec($ch);
        $response = json_decode($result, true);
        curl_close($ch);
        
        if (isset($response['response'])) {
            $dest = str_replace('/content/', '/content/english/', $file->getPathname());
            @mkdir(dirname($dest), 0777, true);
            file_put_contents($dest, $response['response']);
            echo "Sukses disimpan ke: $dest\n";
        } else {
            echo "Gagal menerjemahkan " . $file->getFilename() . "\n";
        }
    }
}
echo "--- Selesai! ---\n";
?>
