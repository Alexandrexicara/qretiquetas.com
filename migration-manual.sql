-- ============================================
-- MIGRATION: Adicionar suporte ao fluxo MANUAL
-- (PIX com chave fixa + valor restante via link de cartao enviado pelo admin)
--
-- Rode este script no banco existente. Pode ser executado mais de uma vez
-- (todos os comandos sao idempotentes).
-- ============================================

-- Tipo do fluxo: 'pagbank' (legado/automatico) ou 'manual' (PIX + cartao admin)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_fluxo VARCHAR(20) DEFAULT 'pagbank';

-- Divisao de valores (em centavos)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_pix INTEGER DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_cartao INTEGER DEFAULT 0;

-- Flags do fluxo manual
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pix_pago BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprovante_pix_path VARCHAR(300);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS link_cartao_admin TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS observacoes_admin TEXT;

-- Token publico para o cliente acompanhar o pedido (link unico)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS token_acesso VARCHAR(64);

-- Indice de unicidade do token (apenas onde nao for nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_token_acesso
    ON pedidos (token_acesso)
    WHERE token_acesso IS NOT NULL;

-- ============================================
-- Status possiveis no fluxo MANUAL:
--   PENDING_PIX                   -> aguardando cliente pagar e enviar comprovante
--   PIX_ENVIADO                   -> comprovante enviado, aguardando admin conferir
--   PIX_CONFIRMADO_AGUARDA_CARTAO -> admin confirmou PIX, aguardando link do cartao
--   LINK_CARTAO_ENVIADO           -> admin colou o link, aguardando cliente pagar cartao
--   PAID                          -> pagamento total confirmado, acesso liberado
--   CANCELADO                     -> pedido cancelado pelo admin
-- ============================================
