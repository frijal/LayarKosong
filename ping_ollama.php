<?php
$url = 'http://localhost:11434/api/tags';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($response) {
    echo "Koneksi ke Ollama BERHASIL!\n";
    echo "Model yang tersedia: " . $response . "\n";
} else {
    echo "Koneksi ke Ollama GAGAL! Error: $error\n";
    echo "Pastikan Ollama sedang jalan di port 11434.\n";
}
?>
