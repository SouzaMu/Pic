🧔💈 Sistema de Gestão para Barbearia — PIC I

Um sistema web desenvolvido para a barbearia Régua & Machado, com o objetivo de otimizar processos internos como:

Agendamento de serviços

Controle de caixa

Gerenciamento de comandas

Visualização de horários dos profissionais

Projeto desenvolvido como parte do Projeto Interdisciplinar de Computação I.

🚀 Tecnologias Utilizadas

HTML, CSS, JavaScript – Interface do sistema

PHP – Back-end e lógica de negócio

MySQL – Banco de dados

Bootstrap – Layout responsivo

Font Awesome – Ícones

📂 Estrutura do Projeto
/agendamentos
/config.php
/Processar_agendamento.php
/salvar_agendamento.php
/Caixa.php
/Coresatt.php
/abrir_comanda.php
/gestao_comanda.php
/Pagina_inicial.html
/Agendamento.html

⚙️ Como Instalar

Baixe ou clone o repositório:

git clone https://github.com/SouzaMu/Pic.git


Coloque o projeto dentro do diretório do servidor local (ex.: htdocs ou www).

Importe o banco de dados no phpMyAdmin.

Ajuste o arquivo config.php com os dados do seu banco:

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "nome_do_banco";

▶️ Como Usar

Acesse a página inicial:
http://localhost/Pic/Pagina_inicial.html

Faça um agendamento

Gerencie comandas

Visualize horários dos profissionais

Controle o caixa da barbearia
