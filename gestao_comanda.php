<?php
require_once 'config.php';

$comanda_id = $_GET['comanda_id'] ?? 0;
$cliente_id = $_GET['cliente_id'] ?? 0;

// Buscar dados da comanda
try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "SELECT c.*, cl.nome as cliente_nome, cl.telefone 
              FROM comandas c 
              JOIN clientes cl ON c.cliente_id = cl.id 
              WHERE c.id = :comanda_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":comanda_id", $comanda_id);
    $stmt->execute();
    $comanda = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$comanda) {
        die("Comanda não encontrada!");
    }
    
    // Buscar itens da comanda
    $query_itens = "SELECT ci.*, s.nome as servico_nome, p.nome as profissional_nome 
                   FROM comanda_itens ci 
                   LEFT JOIN servicos s ON ci.servico_id = s.id 
                   LEFT JOIN profissionais p ON ci.profissional_id = p.id 
                   WHERE ci.comanda_id = :comanda_id 
                   ORDER BY ci.data_criacao DESC";
    $stmt_itens = $db->prepare($query_itens);
    $stmt_itens->bindParam(":comanda_id", $comanda_id);
    $stmt_itens->execute();
    $itens = $stmt_itens->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular total
    $total = 0;
    foreach ($itens as $item) {
        $total += $item['valor_total'];
    }
    
} catch (PDOException $e) {
    die("Erro ao carregar comanda: " . $e->getMessage());
}

// Buscar serviços e profissionais
$servicos = getServicos();
$profissionais = getProfissionais();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Comanda #<?= $comanda_id ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .comanda-header {
            background: linear-gradient(135deg, #6f42c1, #5a34a3);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .total-box {
            background-color: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 15px;
            border-radius: 5px;
        }
        .item-comanda {
            border-left: 4px solid #6f42c1;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #f8f9fa;
        }
        .btn-roxo {
            background-color: #6f42c1;
            border-color: #6f42c1;
            color: white;
        }
        .btn-roxo:hover {
            background-color: #5a34a3;
            border-color: #5a34a3;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <!-- Cabeçalho da Comanda -->
        <div class="comanda-header">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h2><i class="fas fa-receipt me-2"></i>Comanda #<?= $comanda_id ?></h2>
                    <h5><?= htmlspecialchars($comanda['cliente_nome']) ?></h5>
                    <p class="mb-0">
                        <i class="fas fa-phone me-1"></i><?= $comanda['telefone'] ? htmlspecialchars($comanda['telefone']) : 'Não informado' ?>
                    </p>
                </div>
                <div class="col-md-6 text-end">
                    <span class="badge bg-<?= $comanda['status'] == 'aberta' ? 'success' : 'secondary' ?> fs-6">
                        <?= strtoupper($comanda['status']) ?>
                    </span>
                    <p class="mt-2 mb-0">
                        <small>Aberta em: <?= date('d/m/Y H:i', strtotime($comanda['data_abertura'])) ?></small>
                    </p>
                </div>
            </div>
        </div>

        <!-- Adicionar Item -->
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Adicionar Item</h5>
            </div>
            <div class="card-body">
                <form id="formAddItem">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Serviço</label>
                            <select class="form-select" name="servico_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach($servicos as $servico): ?>
                                    <option value="<?= $servico['id'] ?>" data-valor="<?= $servico['valor'] ?>">
                                        <?= htmlspecialchars($servico['nome']) ?> - R$ <?= number_format($servico['valor'], 2, ',', '.') ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Profissional</label>
                            <select class="form-select" name="profissional_id">
                                <option value="">Selecione...</option>
                                <?php foreach($profissionais as $profissional): ?>
                                    <option value="<?= $profissional['id'] ?>"><?= htmlspecialchars($profissional['nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Quantidade</label>
                            <input type="number" class="form-control" name="quantidade" value="1" min="1" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Valor Unit.</label>
                            <input type="number" class="form-control" name="valor_unitario" step="0.01" min="0" required>
                        </div>
                        <div class="col-md-1">
                            <label class="form-label">&nbsp;</label>
                            <button type="submit" class="btn btn-roxo w-100">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Itens da Comanda -->
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-list me-2"></i>Itens da Comanda</h5>
                <div class="total-box">
                    <h4 class="mb-0 text-success">Total: R$ <?= number_format($total, 2, ',', '.') ?></h4>
                </div>
            </div>
            <div class="card-body">
                <?php if (empty($itens)): ?>
                    <div class="text-center py-4">
                        <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Nenhum item adicionado à comanda.</p>
                    </div>
                <?php else: ?>
                    <?php foreach($itens as $item): ?>
                        <div class="item-comanda">
                            <div class="row align-items-center">
                                <div class="col-md-4">
                                    <strong><?= htmlspecialchars($item['servico_nome']) ?></strong>
                                    <?php if ($item['profissional_nome']): ?>
                                        <br><small class="text-muted">Profissional: <?= htmlspecialchars($item['profissional_nome']) ?></small>
                                    <?php endif; ?>
                                </div>
                                <div class="col-md-2">
                                    <small class="text-muted">Qtd: <?= $item['quantidade'] ?></small>
                                </div>
                                <div class="col-md-2">
                                    <small class="text-muted">R$ <?= number_format($item['valor_unitario'], 2, ',', '.') ?></small>
                                </div>
                                <div class="col-md-2">
                                    <strong>R$ <?= number_format($item['valor_total'], 2, ',', '.') ?></strong>
                                </div>
                                <div class="col-md-2 text-end">
                                    <button class="btn btn-sm btn-danger" onclick="removerItem(<?= $item['id'] ?>)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Ações -->
        <div class="row mt-4">
            <div class="col-md-6">
                <button class="btn btn-secondary w-100" onclick="window.history.back()">
                    <i class="fas fa-arrow-left me-2"></i>Voltar
                </button>
            </div>
            <div class="col-md-6">
                <button class="btn btn-success w-100" onclick="fecharComanda(<?= $comanda_id ?>)">
                    <i class="fas fa-lock me-2"></i>Fechar Comanda
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-preencher valor quando selecionar serviço
        document.querySelector('select[name="servico_id"]').addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const valor = selectedOption.getAttribute('data-valor');
            if (valor) {
                document.querySelector('input[name="valor_unitario"]').value = valor;
            }
        });

        // Adicionar item
        document.getElementById('formAddItem').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            formData.append('acao', 'adicionar_item');
            formData.append('comanda_id', <?= $comanda_id ?>);

            fetch('abrir_comanda.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Erro: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao adicionar item.');
            });
        });

        function removerItem(itemId) {
            if (!confirm('Tem certeza que deseja remover este item?')) return;
            
            const formData = new FormData();
            formData.append('acao', 'remover_item');
            formData.append('item_id', itemId);

            fetch('abrir_comanda.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Erro: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao remover item.');
            });
        }

        function fecharComanda(comandaId) {
            if (!confirm('Tem certeza que deseja fechar esta comanda?')) return;
            
            const formData = new FormData();
            formData.append('acao', 'fechar_comanda');
            formData.append('comanda_id', comandaId);

            fetch('abrir_comanda.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Comanda fechada com sucesso!');
                    location.reload();
                } else {
                    alert('Erro: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao fechar comanda.');
            });
        }
    </script>
</body>
</html>