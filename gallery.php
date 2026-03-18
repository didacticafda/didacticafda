<?php
$dir = "img/gallery/";
$files = glob($dir . "*.jpg"); // busca todos los .jpg

// Devuelve un JSON con las rutas
header('Content-Type: application/json');
echo json_encode($files);
?>
