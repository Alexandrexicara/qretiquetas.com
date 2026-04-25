-- Cole isto no Console do PostgreSQL no Render
-- Suporta pagamento à vista (PIX) ou entrada + cartão (2 etapas)

CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(100) PRIMARY KEY,
    cliente VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'PENDING',
    metodo VARCHAR(20) DEFAULT 'avista',           -- 'avista' ou 'parcelado'
    valor INTEGER DEFAULT 600000,                  -- mantido para compatibilidade
    valor_total INTEGER DEFAULT 600000,            -- valor total do pedido (centavos)
    valor_pix INTEGER DEFAULT 540000,              -- valor da entrada/PIX (centavos)
    valor_restante INTEGER DEFAULT 0,              -- valor restante para cartão (centavos)
    entrada_paga BOOLEAN DEFAULT false,            -- entrada (PIX) foi paga?
    cartao_pago BOOLEAN DEFAULT false,             -- cartão foi pago?
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
--
-- Valores de referência:
-- - À vista: R$ 5.400,00 (10% desconto) - valor_total=540000, valor_pix=540000, valor_restante=0
-- - Parcelado: R$ 6.000,00 - valor_total=600000, valor_pix=300000 (entrada), valor_restante=300000 (cartão)
--
-- Status possíveis:
-- - PENDING: Aguardando pagamento
-- - ENTRADA_PAID: Entrada paga, aguardando cartão (só parcelado)
-- - PAID: Pagamento completo - acesso liberado!
