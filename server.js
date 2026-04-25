const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve arquivos estáticos

// Configurações PagBank
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const PAGBANK_BASE_URL = 'https://api.pagbank.com';

// Configuração PostgreSQL (Render usa DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'senha'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'alimentares'}`
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar no PostgreSQL:', err);
    } else {
        console.log('✅ PostgreSQL conectado com sucesso!');
        release();
    }
});

// ============================================
// ENDPOINT: Criar pedido de pagamento
// ============================================
app.post('/api/criar-pagamento', async (req, res) => {
    try {
        const { cliente, email, telefone, cpf } = req.body;
        
        const pedido = {
            reference_id: `PEDIDO-${Date.now()}`,
            customer: {
                name: cliente,
                email: email,
                tax_id: cpf,
                phones: [{
                    country: '55',
                    area: telefone.substring(0, 2),
                    number: telefone.substring(2),
                    type: 'MOBILE'
                }]
            },
            items: [{
                reference_id: 'SISTEMA-ALIMENTARES',
                name: 'Sistema Alimentares - Etiquetas QR Code',
                quantity: 1,
                unit_amount: 600000 // R$ 6.000,00 em centavos
            }],
            notification_urls: [
                `${req.protocol}://${req.get('host')}/api/webhook/pagbank`
            ],
            charges: [{
                reference_id: `COBRANCA-${Date.now()}`,
                description: 'Pagamento Sistema Alimentares',
                amount: {
                    value: 600000,
                    currency: 'BRL'
                },
                payment_method: {
                    type: 'PIX', // ou 'CREDIT_CARD'
                    pix: {
                        expires_in: 86400 // 24 horas
                    }
                }
            }]
        };

        const response = await axios.post(
            `${PAGBANK_BASE_URL}/orders`,
            pedido,
            {
                headers: {
                    'Authorization': `Bearer ${PAGBANK_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Salvar pedido no banco de dados
        await salvarPedido({
            id: response.data.id,
            cliente: cliente,
            email: email,
            cpf: cpf,
            telefone: telefone,
            status: 'PENDING',
            criado_em: new Date().toISOString(),
            dados_pagbank: response.data
        });

        res.json({
            sucesso: true,
            pedido_id: response.data.id,
            qr_code: response.data.charges?.[0]?.qr_code?.text || null,
            qr_code_url: response.data.charges?.[0]?.links?.find(l => l.rel === 'QRCode')?.href || null,
            pix_codigo: response.data.charges?.[0]?.qr_code?.text || null
        });

    } catch (error) {
        console.error('Erro ao criar pagamento:', error.response?.data || error.message);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao criar pagamento',
            detalhes: error.response?.data || error.message
        });
    }
});

// ============================================
// ENDPOINT: Webhook - Receber confirmação PagBank
// ============================================
app.post('/api/webhook/pagbank', async (req, res) => {
    try {
        const { id, status, reference_id } = req.body;
        
        console.log('Webhook recebido:', req.body);

        // Buscar pedido no banco
        const pedido = await buscarPedido(id);
        
        if (pedido) {
            // Atualizar status
            pedido.status = status;
            pedido.atualizado_em = new Date().toISOString();
            pedido.webhook_data = req.body;
            
            await salvarPedido(pedido);

            // Se pagamento confirmado, liberar acesso
            if (status === 'PAID' || status === 'paid') {
                await liberarAcessoCliente(pedido);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Erro');
    }
});

// ============================================
// ENDPOINT: Consultar status do pedido
// ============================================
app.get('/api/pedido/:id', async (req, res) => {
    const pedido = await buscarPedido(req.params.id);
    
    if (!pedido) {
        return res.status(404).json({ erro: 'Pedido não encontrado' });
    }
    
    res.json({
        id: pedido.id,
        status: pedido.status,
        cliente: pedido.cliente,
        email: pedido.email,
        criado_em: pedido.criado_em
    });
});

// ============================================
// ENDPOINT: Listar todos os pedidos (admin)
// ============================================
app.get('/api/pedidos', async (req, res) => {
    const pedidos = await listarPedidos();
    res.json(pedidos);
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// ============================================
// FUNÇÕES DE BANCO DE DADOS - POSTGRESQL
// ============================================

async function salvarPedido(pedido) {
    const query = `
        INSERT INTO pedidos (id, cliente, email, cpf, telefone, status, valor, criado_em, dados_pagbank)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            atualizado_em = CURRENT_TIMESTAMP,
            dados_pagbank = EXCLUDED.dados_pagbank
    `;
    
    const values = [
        pedido.id,
        pedido.cliente,
        pedido.email,
        pedido.cpf || '',
        pedido.telefone || '',
        pedido.status || 'PENDING',
        600000,
        pedido.criado_em || new Date().toISOString(),
        JSON.stringify(pedido.dados_pagbank || {})
    ];
    
    await pool.query(query, values);
}

async function buscarPedido(id) {
    const query = 'SELECT * FROM pedidos WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
}

async function listarPedidos() {
    const query = 'SELECT * FROM pedidos ORDER BY criado_em DESC';
    const result = await pool.query(query);
    return result.rows;
}

async function liberarAcessoCliente(pedido) {
    const senhaTemp = Math.random().toString(36).substring(2, 8);
    
    const query = `
        INSERT INTO usuarios (nome, email, senha, tipo, ativo, pedido_id, liberado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
            ativo = EXCLUDED.ativo,
            liberado_em = EXCLUDED.liberado_em,
            pedido_id = EXCLUDED.pedido_id
    `;
    
    const values = [
        pedido.cliente,
        pedido.email,
        senhaTemp,
        'cliente',
        true,
        pedido.id,
        new Date().toISOString()
    ];
    
    await pool.query(query, values);
    
    console.log(`✅ Acesso liberado para: ${pedido.cliente} (${pedido.email})`);
    console.log(`🔑 Senha temporária: ${senhaTemp}`);
    
    // TODO: Enviar e-mail com dados de acesso
    // enviarEmailConfirmacao(pedido.email, pedido.cliente, senhaTemp);
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Landing page: http://localhost:${PORT}/index.html`);
    console.log(`💳 Checkout: http://localhost:${PORT}/checkout.html`);
    console.log(`🔔 Webhook URL: http://localhost:${PORT}/api/webhook/pagbank`);
});
