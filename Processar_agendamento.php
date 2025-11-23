<?php
require_once 'config.php';

if ($_POST) {
    // Processar agendamento
    $database = new Database();
    $db = $database->getConnection();
    
    try {
        // Inserir agendamento
        $query = "INSERT INTO agendamentos (cliente_id, data_agendamento, hora_inicio, hora_fim, status) 
                  VALUES (:cliente_id, :data_agendamento, :hora_inicio, :hora_fim, :status)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":cliente_id", $_POST['cliente_id']);
        $stmt->bindParam(":data_agendamento", $_POST['data_agendamento']);
        $stmt->bindParam(":hora_inicio", $_POST['hora_inicio']);
        $stmt->bindParam(":hora_fim", $_POST['hora_fim']);
        $stmt->bindParam(":status", $_POST['status']);
        
        $stmt->execute();
        $agendamento_id = $db->lastInsertId();
        
        // Inserir serviços do agendamento
        if (isset($_POST['servicos'])) {
            foreach ($_POST['servicos'] as $servico) {
                $query_servico = "INSERT INTO agendamento_servicos (agendamento_id, servico_id, profissional_id, valor) 
                                 VALUES (:agendamento_id, :servico_id, :profissional_id, :valor)";
                
                $stmt_servico = $db->prepare($query_servico);
                $stmt_servico->bindParam(":agendamento_id", $agendamento_id);
                $stmt_servico->bindParam(":servico_id", $servico['servico_id']);
                $stmt_servico->bindParam(":profissional_id", $servico['profissional_id']);
                $stmt_servico->bindParam(":valor", $servico['valor']);
                
                $stmt_servico->execute();
            }
        }
        
        echo json_encode(["success" => true, "message" => "Agendamento salvo com sucesso!"]);
        
    } catch(PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erro: " . $e->getMessage()]);
    }
}
?>