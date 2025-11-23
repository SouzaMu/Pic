<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao'])) {
    
    if ($_POST['acao'] == 'abrir_comanda') {
        $cliente_id = intval($_POST['cliente_id'] ?? 0);
        
        if ($cliente_id <= 0) {
            echo json_encode(["success" => false, "message" => "Cliente inválido."]);
            exit;
        }
        
        try {
            $database = new Database();
            $db = $database->getConnection();
            
            // Verificar se já existe comanda aberta para este cliente
            $query_verifica = "SELECT id FROM comandas WHERE cliente_id = :cliente_id AND status = 'aberta'";
            $stmt_verifica = $db->prepare($query_verifica);
            $stmt_verifica->bindParam(":cliente_id", $cliente_id);
            $stmt_verifica->execute();
            
            if ($stmt_verifica->fetch()) {
                echo json_encode(["success" => false, "message" => "Este cliente já possui uma comanda aberta."]);
                exit;
            }
            
            // Abrir nova comanda
            $query = "INSERT INTO comandas (cliente_id, status) VALUES (:cliente_id, 'aberta')";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":cliente_id", $cliente_id);
            
            if ($stmt->execute()) {
                $comanda_id = $db->lastInsertId();
                
                echo json_encode([
                    "success" => true, 
                    "message" => "Comanda aberta com sucesso!",
                    "comanda_id" => $comanda_id
                ]);
            } else {
                echo json_encode(["success" => false, "message" => "Erro ao abrir comanda."]);
            }
            
        } catch (PDOException $e) {
            error_log("Erro ao abrir comanda: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Erro no banco: " . $e->getMessage()]);
        }
        exit;
    }
    
    if ($_POST['acao'] == 'adicionar_item') {
        $comanda_id = intval($_POST['comanda_id'] ?? 0);
        $servico_id = intval($_POST['servico_id'] ?? 0);
        $profissional_id = intval($_POST['profissional_id'] ?? 0);
        $quantidade = intval($_POST['quantidade'] ?? 1);
        $valor_unitario = floatval($_POST['valor_unitario'] ?? 0);
        $valor_total = $quantidade * $valor_unitario;
        
        if ($comanda_id <= 0 || $servico_id <= 0 || $valor_unitario <= 0) {
            echo json_encode(["success" => false, "message" => "Dados inválidos."]);
            exit;
        }
        
        try {
            $database = new Database();
            $db = $database->getConnection();
            
            $query = "INSERT INTO comanda_itens (comanda_id, servico_id, profissional_id, quantidade, valor_unitario, valor_total) 
                     VALUES (:comanda_id, :servico_id, :profissional_id, :quantidade, :valor_unitario, :valor_total)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":comanda_id", $comanda_id);
            $stmt->bindParam(":servico_id", $servico_id);
            $stmt->bindParam(":profissional_id", $profissional_id);
            $stmt->bindParam(":quantidade", $quantidade);
            $stmt->bindParam(":valor_unitario", $valor_unitario);
            $stmt->bindParam(":valor_total", $valor_total);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Item adicionado com sucesso!"]);
            } else {
                echo json_encode(["success" => false, "message" => "Erro ao adicionar item."]);
            }
            
        } catch (PDOException $e) {
            error_log("Erro ao adicionar item: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Erro no banco: " . $e->getMessage()]);
        }
        exit;
    }
    
    if ($_POST['acao'] == 'remover_item') {
        $item_id = intval($_POST['item_id'] ?? 0);
        
        if ($item_id <= 0) {
            echo json_encode(["success" => false, "message" => "Item inválido."]);
            exit;
        }
        
        try {
            $database = new Database();
            $db = $database->getConnection();
            
            $query = "DELETE FROM comanda_itens WHERE id = :item_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":item_id", $item_id);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Item removido com sucesso!"]);
            } else {
                echo json_encode(["success" => false, "message" => "Erro ao remover item."]);
            }
            
        } catch (PDOException $e) {
            error_log("Erro ao remover item: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Erro no banco: " . $e->getMessage()]);
        }
        exit;
    }
    
    if ($_POST['acao'] == 'fechar_comanda') {
        $comanda_id = intval($_POST['comanda_id'] ?? 0);
        
        if ($comanda_id <= 0) {
            echo json_encode(["success" => false, "message" => "Comanda inválida."]);
            exit;
        }
        
        try {
            $database = new Database();
            $db = $database->getConnection();
            
            $query = "UPDATE comandas SET status = 'fechada', data_fechamento = NOW() WHERE id = :comanda_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":comanda_id", $comanda_id);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Comanda fechada com sucesso!"]);
            } else {
                echo json_encode(["success" => false, "message" => "Erro ao fechar comanda."]);
            }
            
        } catch (PDOException $e) {
            error_log("Erro ao fechar comanda: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Erro no banco: " . $e->getMessage()]);
        }
        exit;
    }
}

echo json_encode(["success" => false, "message" => "Ação não reconhecida"]);
?>