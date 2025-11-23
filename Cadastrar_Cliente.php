<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_POST['acao'] == 'cadastrar_cliente') {
    $nome = trim($_POST['nome'] ?? '');
    $telefone = trim($_POST['telefone'] ?? '');
    $email = trim($_POST['email'] ?? '');
    
    if (empty($nome)) {
        echo json_encode(["success" => false, "message" => "Nome é obrigatório."]);
        exit;
    }
    
    if (cadastrarClienteSimples($nome, $telefone, $email)) {
        echo json_encode(["success" => true, "message" => "Cliente cadastrado com sucesso!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao cadastrar cliente."]);
    }
    exit;
}

echo json_encode(["success" => false, "message" => "Ação inválida"]);
?>