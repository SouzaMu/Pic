<?php
require_once 'config.php';

// Processar formulário
if ($_POST && isset($_POST['data']) && isset($_POST['titulo']) && isset($_POST['valor'])) {
    $data = $_POST['data'];
    $titulo = $_POST['titulo'];
    $forma_pagamento = $_POST['pagamento'] ?? 'dinheiro';
    $valor = floatval($_POST['valor']);
    $tipo = $_POST['tipo'] ?? 'entrada';
    
    if ($titulo && $valor > 0) {
        if (addMovimentoCaixa($data, $titulo, $forma_pagamento, $valor, $tipo)) {
            echo "<script>alert('Lançamento adicionado com sucesso!');</script>";
        }
    }
}

// Processar exclusão
if (isset($_GET['excluir'])) {
    $id = intval($_GET['excluir']);
    $database = new Database();
    $db = $database->getConnection();
    $query = "DELETE FROM caixa WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $id);
    $stmt->execute();
    
    echo "<script>alert('Lançamento excluído com sucesso!');</script>";
    echo "<script>window.location.href = 'pic-caixa1.php';</script>";
}

// Buscar movimentos do dia atual
$data_hoje = date('Y-m-d');
$movimentos = getMovimentosCaixa($data_hoje);
$total = 0;

foreach ($movimentos as $mov) {
    if ($mov['tipo'] == 'entrada') {
        $total += $mov['valor'];
    } else {
        $total -= $mov['valor'];
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Caixa</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .botao {
      margin: 10px;
      padding: 8px 12px;
      background: #4d98e2;
      color: white;
      border: none;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f2f2f2;
    }
    .total {
      margin-top: 15px;
      font-weight: bold;
    }
    @media print {
      .botao, .formulario, .navbar { display: none; }
    }
    .bg-roxo { background-color: #6f42c1 !important; }
    .btn-roxo {
      background-color: #6f42c1;
      border-color: #6f42c1;
      color: white;
    }
    .btn-roxo:hover {
      background-color: #5a34a3;
      border-color: #5a34a3;
    }
    .entrada { color: green; font-weight: bold; }
    .saida { color: red; font-weight: bold; }
  </style>
</head>
<body>

  <!-- Navegação -->
  <nav class="navbar navbar-dark bg-roxo mb-4">
    <div class="container">
      <a class="navbar-brand" href="Pagina_inicial.html">← Voltar ao Menu</a>
      <span class="navbar-text">Controle de Caixa - <?= date('d/m/Y') ?></span>
    </div>
  </nav>

  <div class="container">
    <h1 class="mb-4">Controle de Caixa</h1>

    <div style="text-align: center;">
      <button class="btn btn-roxo" onclick="window.print()">Gerar PDF / Imprimir</button>
    </div>

    <div class="formulario mt-4">
      <form method="POST" class="row g-3">
        <div class="col-md-3">
          <label class="form-label">Data:</label>
          <input type="date" name="data" class="form-control" value="<?= date('Y-m-d') ?>" required>
        </div>
        <div class="col-md-3">
          <label class="form-label">Título:</label>
          <select name="titulo" class="form-select" required>
            <option value="">Selecione...</option>
            <option>Corte Masculino</option>
            <option>Corte Feminino</option>
            <option>Barba</option>
            <option>Barboterapia</option>
            <option>Hidratação</option>
            <option>Produtos</option>
            <option>Aluguel</option>
            <option>Salários</option>
            <option>Outro</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Forma de pagamento:</label>
          <select name="pagamento" class="form-select">
            <option value="dinheiro">Dinheiro</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="pix">PIX</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Valor:</label>
          <input type="number" name="valor" class="form-control" required step="0.01" min="0" placeholder="0.00">
        </div>
        <div class="col-md-2">
          <label class="form-label">Tipo:</label>
          <select name="tipo" class="form-select">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <div class="col-12">
          <button type="submit" class="btn btn-roxo">Adicionar Lançamento</button>
        </div>
      </form>
    </div>

    <table class="table table-bordered mt-4">
      <thead class="table-light">
        <tr>
          <th>Data</th>
          <th>Título</th>
          <th>Forma de Pagamento</th>
          <th>Valor</th>
          <th>Tipo</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($movimentos)): ?>
          <tr>
            <td colspan="6" class="text-center">Nenhum lançamento encontrado para hoje.</td>
          </tr>
        <?php else: ?>
          <?php foreach($movimentos as $mov): ?>
          <tr>
            <td><?= date('d/m/Y', strtotime($mov['data_movimento'])) ?></td>
            <td><?= htmlspecialchars($mov['titulo']) ?></td>
            <td><?= ucfirst($mov['forma_pagamento']) ?></td>
            <td class="<?= $mov['tipo'] == 'entrada' ? 'entrada' : 'saida' ?>">
              R$ <?= number_format($mov['valor'], 2, ',', '.') ?>
            </td>
            <td>
              <span class="badge bg-<?= $mov['tipo'] == 'entrada' ? 'success' : 'danger' ?>">
                <?= $mov['tipo'] == 'entrada' ? 'Entrada' : 'Saída' ?>
              </span>
            </td>
            <td>
              <a href="pic-caixa1.php?excluir=<?= $mov['id'] ?>" class="btn btn-sm btn-danger" 
                 onclick="return confirm('Tem certeza que deseja excluir este lançamento?')">
                Excluir
              </a>
            </td>
          </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>

    <div class="total alert <?= $total >= 0 ? 'alert-success' : 'alert-danger' ?>">
      <h5>SALDO DO DIA: R$ <?= number_format($total, 2, ',', '.') ?></h5>
    </div>
  </div>

  <script>
    // Função para formatar data (mantida do original)
    function formatarData(dataISO) {
      const [ano, mes, dia] = dataISO.split('-');
      return `${dia}/${mes}/${ano}`;
    }

    // Adicionar validação no formulário
    document.querySelector('form').addEventListener('submit', function(e) {
      const valor = document.querySelector('input[name="valor"]').value;
      if (parseFloat(valor) <= 0) {
        alert('O valor deve ser maior que zero!');
        e.preventDefault();
      }
    });
  </script>

</body>
</html>