<?php
class Database {
    private $host = "localhost";
    private $db_name = "Forja_Corte";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            error_log("Erro de conexão: " . $exception->getMessage());
            return false;
        }
        return $this->conn;
    }
}

date_default_timezone_set('America/Sao_Paulo');

// Função SIMPLES para buscar clientes
function getClientes() {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        if (!$db) return [];
        
        $query = "SELECT * FROM clientes ORDER BY nome";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("Erro ao buscar clientes: " . $e->getMessage());
        return [];
    }
}

// Função SIMPLES para cadastrar cliente
function cadastrarClienteSimples($nome, $telefone = null, $email = null) {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        if (!$db) return false;
        
        $query = "INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)";
        $stmt = $db->prepare($query);
        return $stmt->execute([$nome, $telefone, $email]);
        
    } catch (PDOException $e) {
        error_log("Erro ao cadastrar cliente: " . $e->getMessage());
        return false;
    }
}

// Função para buscar serviços
function getServicos() {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        if (!$db) return [];
        
        $query = "SELECT * FROM servicos WHERE ativo = 1";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}
?>