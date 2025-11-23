<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $clientes = buscarClientes();
    echo json_encode([
        'success' => true,
        'clientes' => $clientes
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar clientes: ' . $e->getMessage()
    ]);
}
?>