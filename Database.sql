-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS Forja_Corte;
USE Forja_Corte;

-- Tabela de clientes
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de profissionais
CREATE TABLE profissionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de serviços
CREATE TABLE servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    duracao INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de agendamentos
CREATE TABLE agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    profissional_id INT,
    data_agendamento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status ENUM('agendado', 'confirmado', 'aguardando', 'em_atendimento', 'finalizado', 'pago', 'cancelado', 'faltou') DEFAULT 'agendado',
    observacao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

-- Tabela de agendamento_servicos 
CREATE TABLE agendamento_servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agendamento_id INT NOT NULL,
    servico_id INT NOT NULL,
    profissional_id INT,
    valor DECIMAL(10,2) NOT NULL,
    observacao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (servico_id) REFERENCES servicos(id),
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
);

-- Tabela de caixa
CREATE TABLE caixa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_movimento DATE NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    forma_pagamento ENUM('dinheiro', 'debito', 'credito', 'pix') NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    tipo ENUM('entrada', 'saida') DEFAULT 'entrada',
    observacao TEXT,
    agendamento_id INT NULL,
    cliente_id INT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);
-- Tabela de comandas
CREATE TABLE IF NOT EXISTS comandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP NULL,
    status ENUM('aberta', 'fechada', 'paga') DEFAULT 'aberta',
    total DECIMAL(10,2) DEFAULT 0.00,
    observacoes TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- Tabela de itens da comanda
CREATE TABLE IF NOT EXISTS comanda_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comanda_id INT NOT NULL,
    servico_id INT NOT NULL,
    profissional_id INT,
    quantidade INT DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    observacao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
    FOREIGN KEY (servico_id) REFERENCES servicos(id),
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
);

-- Inserir dados iniciais de profissionais
INSERT INTO profissionais (nome, especialidade) VALUES 
('João', 'Cortes Masculinos'),
('Maria', 'Colorização'),
('Carlos', 'Cortes Femininos'),
('Tiago Melo', 'Barboterapia'),
('Estevan Araujo', 'Cortes'),
('Alice Azevedo', 'Hidratação');

-- Inserir dados iniciais de serviços
INSERT INTO servicos (nome, duracao, valor) VALUES 
('Corte Masculino', 30, 35.00),
('Corte Feminino', 60, 80.00),
('Barba', 30, 25.00),
('Barboterapia', 40, 60.00),
('Hidratação', 45, 70.00),
('Coloração', 120, 120.00);

-- Inserir cliente de exemplo
INSERT INTO clientes (nome, telefone, email) VALUES 
('Cliente Teste', '(11) 99999-9999', 'cliente@teste.com');

-- Inserir alguns agendamentos de exemplo
INSERT INTO agendamentos (cliente_id, profissional_id, data_agendamento, hora_inicio, hora_fim, status) VALUES 
(1, 1, CURDATE(), '09:00', '10:00', 'agendado'),
(1, 2, CURDATE(), '14:00', '15:00', 'confirmado');

-- Inserir serviços nos agendamentos (ATUALIZADO para nova estrutura)
INSERT INTO agendamento_servicos (agendamento_id, servico_id, profissional_id, valor) VALUES 
(1, 1, 1, 35.00),
(2, 2, 2, 80.00);

-- Inserir movimentações de caixa de exemplo
INSERT INTO caixa (data_movimento, titulo, forma_pagamento, valor, tipo, cliente_id) VALUES 
(CURDATE(), 'Corte Masculino', 'dinheiro', 35.00, 'entrada', 1),
(CURDATE(), 'Produtos', 'debito', 50.00, 'saida', NULL);