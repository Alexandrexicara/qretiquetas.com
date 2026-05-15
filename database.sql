-- ============================================
-- BANCO DE DADOS ALIMENTARES - POSTGRESQL
-- ============================================

-- Criar banco de dados (execute como superusuário)
-- CREATE DATABASE alimentares;

-- Conectar ao banco: \c alimentares

-- ============================================
-- TABELA: pedidos
-- ============================================
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(100) PRIMARY KEY,
    cliente VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'PENDING',
    metodo VARCHAR(20) DEFAULT 'avista',
    valor_total INTEGER DEFAULT 600000, -- valor em centavos (R$ 6.000,00)
    entrada_paga BOOLEAN DEFAULT false,
    cartao_pago BOOLEAN DEFAULT false,
    -- Suporte ao fluxo MANUAL (PIX + Cartão admin)
    tipo_fluxo VARCHAR(20) DEFAULT 'pagbank',  -- 'pagbank' ou 'manual'
    valor_pix INTEGER DEFAULT 0,
    valor_cartao INTEGER DEFAULT 0,
    pix_pago BOOLEAN DEFAULT false,
    comprovante_pix_path VARCHAR(300),
    link_cartao_admin TEXT,
    observacoes_admin TEXT,
    token_acesso VARCHAR(64),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dados_pagbank JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_email ON pedidos(email);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_token_acesso
    ON pedidos (token_acesso)
    WHERE token_acesso IS NOT NULL;

-- ============================================
-- TABELA: usuarios (sistema de etiquetas)
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'cliente', -- 'admin' ou 'cliente'
    ativo BOOLEAN DEFAULT false,
    pedido_id VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    liberado_em TIMESTAMP
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- ============================================
-- EXEMPLO: Inserir usuário admin padrão
-- ============================================
-- INSERT INTO usuarios (nome, email, senha, tipo, ativo)
-- VALUES ('Administrador', 'admin@alimentares.com', 'admin123', 'admin', true);

-- ============================================
-- EXEMPLO: Inserir cliente de teste
-- ============================================
-- INSERT INTO usuarios (nome, email, senha, tipo, ativo)
-- VALUES ('Teste', 'teste@email.com', '123456', 'cliente', true);

-- ============================================
-- COMANDOS ÚTEIS
-- ============================================

-- Listar todos os pedidos
-- SELECT * FROM pedidos ORDER BY criado_em DESC;

-- Listar usuários ativos
-- SELECT * FROM usuarios WHERE ativo = true;

-- Atualizar status do pedido
-- UPDATE pedidos SET status = 'PAID', atualizado_em = CURRENT_TIMESTAMP WHERE id = 'PEDIDO-XXX';

-- Ver pedidos pendentes
-- SELECT * FROM pedidos WHERE status = 'PENDING';
