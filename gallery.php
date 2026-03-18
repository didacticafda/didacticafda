<?php
header('Content-Type: application/json; charset=utf-8');

$dir = __DIR__ . "/img/gallery/";   // ruta absoluta
$files = glob($dir . "*.jpg");      // busca todos los .jpg

// Convertimos las rutas absolutas en relativas
$relativeFiles = array_map(function($file) {
    return "img/gallery/" . basename($file);
}, $files);

echo json_encode($relativeFiles);
?>