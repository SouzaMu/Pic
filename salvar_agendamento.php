<?php
require_once 'config.php';

header('Content-Type: application/json');

// Ler dados JSON
$input = json_decode(file_get_contents('php://input'), true);

if ($input['acao'] == 'salvar_agendamento') {
    $cliente_id = intval($input['cliente_id'] ?? 0);
    $data_agendamento = $input['data_agendamento'] ?? date('Y-m-d');
    $servicos = $input['servicos'] ?? [];
    $status = $input['status'] ?? 'agendado';
    
    // Validar
    if ($cliente_id <= 0) {
        echo json_encode(["success" => false, "message" => "Cliente inválido."]);
        exit;
    }
    
    if (empty($servicos)) {
        echo json_encode(["success" => false, "message" => "Nenhum serviço informado."]);
        exit;
    }
    
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        if (!$db) {
            echo json_encode(["success" => false, "message" => "Erro de conexão com o banco."]);
            exit;
        }
        
        // Calcular horários
        $hora_inicio = '09:00';
        $total_minutos = 0;
        
        foreach ($servicos as $servico) {
            $total_minutos += intval($servico['tempo']);
        }
        
        $hora_fim = date('H:i', strtotime($hora_inicio . ' + ' . $total_minutos . ' minutes'));
        
        // Inserir agendamento
        $query_agendamento = "INSERT INTO agendamentos (cliente_id, data_agendamento, hora_inicio, hora_fim, status) 
                             VALUES (:cliente_id, :data_agendamento, :hora_inicio, :hora_fim, :status)";
        
        $stmt_agendamento = $db->prepare($query_agendamento);
        $stmt_agendamento->bindParam(":cliente_id", $cliente_id);
        $stmt_agendamento->bindParam(":data_agendamento", $data_agendamento);
        $stmt_agendamento->bindParam(":hora_inicio", $hora_inicio);
        $stmt_agendamento->bindParam(":hora_fim", $hora_fim);
        $stmt_agendamento->bindParam(":status", $status);
        
        if ($stmt_agendamento->execute()) {
            $agendamento_id = $db->lastInsertId();
            
            // Mapear serviços para IDs
            $mapa_servicos = [
                'Barboterapia' => 1,
                'Corte' => 2,
                'Barba' => 3,
                'Hidratação' => 4
            ];
            
            // Inserir serviços
            foreach ($servicos as $servico) {
                $servico_id = $mapa_servicos[$servico['servico']] ?? 1;
                
                $query_servico = "INSERT INTO agendamento_servicos (agendamento_id, servico_id, valor) 
                                 VALUES (:agendamento_id, :servico_id, :valor)";
                
                $stmt_servico = $db->prepare($query_servico);
                $stmt_servico->bindParam(":agendamento_id", $agendamento_id);
                $stmt_servico->bindParam(":servico_id", $servico_id);
                $stmt_servico->bindParam(":valor", $servico['valor']);
                
                $stmt_servico->execute();
            }
            
            echo json_encode([
                "success" => true, 
                "message" => "Agendamento salvo com sucesso! ID: #" . $agendamento_id,
                "id" => $agendamento_id
            ]);
            
        } else {
            echo json_encode(["success" => false, "message" => "Erro ao salvar agendamento."]);
        }
        
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erro: " . $e->getMessage()]);
    }
    exit;
}

echo json_encode(["success" => false, "message" => "Ação não reconhecida"]);
?>