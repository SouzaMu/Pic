<?php
require_once 'Config.php';

// Configuração
date_default_timezone_set("America/Sao_Paulo");
$data_hoje = date("Y-m-d");

// Buscar profissionais do banco
$profissionais = getProfissionais();
$cabeleireiros = array_column($profissionais, 'nome');

// Buscar agendamentos do dia
$agendamentos = getAgendamentosDoDia($data_hoje);

// Intervalos de horário (em minutos)
$horarios = range(8*60, 18*60, 60);

// Hora atual em minutos
$agoraMin = intval(date("H")) * 60 + intval(date("i"));
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Agenda Cabeleireiros</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .passado { background-color: #f8d7da !important; }
    .atual   { background-color: #d4edda !important; }
    .futuro  { background-color: #cce5ff !important; }
    .bg-roxo { background-color: #6f42c1 !important; }
    .agendado { background-color: #e7f3ff !important; border-left: 3px solid #007bff; }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark bg-roxo mb-4">
    <div class="container">
      <a class="navbar-brand" href="Pagina_inicial.html">← Voltar ao Menu</a>
      <span class="navbar-text">Agenda dos Profissionais - <?= date("d/m/Y") ?></span>
    </div>
  </nav>

  <div class="container">
    <h2 class="mb-4">Agenda de Hoje (<?= date("d/m/Y H:i") ?>)</h2>

    <div class="alert alert-info">
      <strong>Legenda:</strong> 
      <span class="badge bg-success">Horário Atual</span>
      <span class="badge bg-primary">Futuro</span>
      <span class="badge bg-danger">Passado</span>
      <span class="badge bg-info">Agendado</span>
    </div>

    <table class="table table-bordered text-center">
      <thead class="table-dark">
        <tr>
          <th>Horário</th>
          <?php foreach($cabeleireiros as $nome): ?>
            <th><?= htmlspecialchars($nome) ?></th>
          <?php endforeach; ?>
        </tr>
      </thead>
      <tbody>
        <?php foreach($horarios as $horaMin): 
          $horaStr = sprintf("%02d:%02d", intdiv($horaMin, 60), $horaMin % 60);
          $horaTime = $horaStr . ":00";

          // Definir cor do horário
          if ($agoraMin >= $horaMin && $agoraMin < $horaMin + 60) {
            $classe = "atual";
          } elseif ($agoraMin >= $horaMin + 60) {
            $classe = "passado";
          } else {
            $classe = "futuro";
          }
        ?>
          <tr>
            <td class="<?= $classe ?>"><strong><?= $horaStr ?></strong></td>
            <?php foreach($cabeleireiros as $profissional): ?>
              <td class="<?= $classe ?>">
                <?php
                // Verificar se há agendamento para este profissional neste horário
                $agendamento_encontrado = false;
                foreach($agendamentos as $agendamento) {
                  $hora_inicio = substr($agendamento['hora_inicio'], 0, 5);
                  
                 
                  if ($hora_inicio == $horaStr && isset($agendamento['profissional_nome']) && $agendamento['profissional_nome'] == $profissional) {
                    echo '<div class="agendado p-1 small">';
                    echo '<strong>' . htmlspecialchars($agendamento['cliente_nome']) . '</strong><br>';
                    echo '<small>' . htmlspecialchars($agendamento['status']) . '</small>';
                    echo '</div>';
                    $agendamento_encontrado = true;
                    break;
                  }
                }
                if (!$agendamento_encontrado) {
                  echo '-';
                }
                ?>
              </td>
            <?php endforeach; ?>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>