const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

        // Salvar pedido no arquivo
        salvarPedido({
            id: response.data.id,
            cliente: cliente,
            email: email,
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
app.post('/api/webhook/pagbank', (req, res) => {
    try {
        const { id, status, reference_id } = req.body;
        
        console.log('Webhook recebido:', req.body);

        // Buscar pedido
        const pedido = buscarPedido(id);
        
        if (pedido) {
            // Atualizar status
            pedido.status = status;
            pedido.atualizado_em = new Date().toISOString();
            pedido.webhook_data = req.body;
            
            salvarPedido(pedido);

            // Se pagamento confirmado, liberar acesso
            if (status === 'PAID' || status === 'paid') {
                liberarAcessoCliente(pedido);
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
app.get('/api/pedido/:id', (req, res) => {
    const pedido = buscarPedido(req.params.id);
    
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
app.get('/api/pedidos', (req, res) => {
    const pedidos = listarPedidos();
    res.json(pedidos);
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const fs = require('fs');
const path = require('path');
const PEDIDOS_FILE = path.join(__dirname, 'dados', 'pedidos.json');

function salvarPedido(pedido) {
    let pedidos = [];
    
    if (fs.existsSync(PEDIDOS_FILE)) {
        pedidos = JSON.parse(fs.readFileSync(PEDIDOS_FILE, 'utf8'));
    }
    
    // Atualizar ou adicionar
    const index = pedidos.findIndex(p => p.id === pedido.id);
    if (index >= 0) {
        pedidos[index] = pedido;
    } else {
        pedidos.push(pedido);
    }
    
    fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2));
}

function buscarPedido(id) {
    if (!fs.existsSync(PEDIDOS_FILE)) return null;
    
    const pedidos = JSON.parse(fs.readFileSync(PEDIDOS_FILE, 'utf8'));
    return pedidos.find(p => p.id === id) || null;
}

function listarPedidos() {
    if (!fs.existsSync(PEDIDOS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PEDIDOS_FILE, 'utf8'));
}

function liberarAcessoCliente(pedido) {
    // Criar usuário no sistema
    const usuario = {
        id: Date.now(),
        nome: pedido.cliente,
        email: pedido.email,
        tipo: 'cliente',
        ativo: true,
        pedido_id: pedido.id,
        liberado_em: new Date().toISOString()
    };
    
    // Salvar usuário
    const usuariosFile = path.join(__dirname, 'dados', 'usuarios_pagamento.json');
    let usuarios = [];
    if (fs.existsSync(usuariosFile)) {
        usuarios = JSON.parse(fs.readFileSync(usuariosFile, 'utf8'));
    }
    usuarios.push(usuario);
    fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
    
    console.log(`Acesso liberado para: ${pedido.cliente} (${pedido.email})`);
    
    // Aqui você pode enviar e-mail de confirmação
    // enviarEmailConfirmacao(pedido.email, usuario);
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Landing page: http://localhost:${PORT}/index.html`);
    console.log(`💳 Checkout: http://localhost:${PORT}/checkout.html`);
    console.log(`🔔 Webhook URL: http://localhost:${PORT}/api/webhook/pagbank`);
});
