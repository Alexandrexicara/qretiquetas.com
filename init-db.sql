-- Cole isto no Console do PostgreSQL no Render
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(100) PRIMARY KEY,
    cliente VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'PENDING',
    valor INTEGER DEFAULT 600000,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dados_pagbank JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'cliente',
    ativo BOOLEAN DEFAULT false,
    pedido_id VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    liberado_em TIMESTAMP
);

-- Feito! Tabelas criadas.
