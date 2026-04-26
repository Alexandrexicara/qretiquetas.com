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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'santossilvac990@gmail.com';

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
        console.log('=== NOVA REQUISIÇÃO /api/criar-pagamento ===');
        console.log('Body recebido:', req.body);
        
        const { cliente, email, telefone, cpf, metodo } = req.body;
        
        if (!cliente || !email || !telefone || !cpf) {
            console.log('ERRO: Campos obrigatórios faltando');
            return res.status(400).json({
                sucesso: false,
                erro: 'Dados incompletos',
                campos_recebidos: { cliente: !!cliente, email: !!email, telefone: !!telefone, cpf: !!cpf }
            });
        }
        
        // Definir valores conforme método de pagamento (3 opções)
        // avista = R$ 5.400, entrada = R$ 1.000, cartao = R$ 6.000
        let valorTotal;
        let descricao;
        
        if (metodo === 'avista') {
            valorTotal = 540000;  // R$ 5.400
            descricao = 'Pagamento Sistema Alimentares - À Vista';
        } else if (metodo === 'entrada') {
            valorTotal = 100000;  // R$ 1.000 (entrada)
            descricao = 'Pagamento Entrada - Sistema Alimentares';
        } else {
            // cartao ou qualquer outro
            valorTotal = 600000;  // R$ 6.000
            descricao = 'Pagamento Sistema Alimentares - Cartão';
        }
        
        console.log('Configuração:', { 
            metodo,
            valorTotal: valorTotal / 100
        });
        
        // Verificar se token PagBank está configurado
        if (!PAGBANK_TOKEN) {
            console.log('ERRO: PAGBANK_TOKEN não configurado');
            return res.status(500).json({
                sucesso: false,
                erro: 'Token PagBank não configurado'
            });
        }
        console.log('Token PagBank OK');
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
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
                unit_amount: valorTotal
            }],
            notification_urls: [
                `${baseUrl}/api/webhook/pagbank`
            ],
            redirect_urls: {
                success: `${baseUrl}/pagamento-retorno.html?status=sucesso&pedido_id=PEDIDO_ID`,
                failure: `${baseUrl}/pagamento-retorno.html?status=erro&pedido_id=PEDIDO_ID`,
                pending: `${baseUrl}/pagamento-retorno.html?status=pendente&pedido_id=PEDIDO_ID`
            },
            charges: [{
                reference_id: `COBRANCA-${Date.now()}`,
                description: descricao,
                amount: {
                    value: valorTotal,
                    currency: 'BRL'
                },
                payment_method: {
                    type: 'PIX',
                    pix: {
                        expires_in: 86400
                    }
                }
            }]
        };

        console.log('Enviando para PagBank...');
        
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
        
        console.log('Resposta PagBank OK:', response.data.id);

        // Salvar pedido no banco de dados
        await salvarPedido({
            id: response.data.id,
            cliente: cliente,
            email: email,
            cpf: cpf,
            telefone: telefone,
            status: 'PENDING',
            metodo: metodo || 'avista',
            valor_total: valorTotal,
            entrada_paga: false,
            cartao_pago: false,
            criado_em: new Date().toISOString(),
            dados_pagbank: response.data
        });

        // Notificar novo pedido
        console.log(`\n🛒 NOVO PEDIDO CRIADO!`);
        console.log(`   Cliente: ${cliente}`);
        console.log(`   Email: ${email}`);
        if (metodo === 'avista') {
            console.log(`   Método: À Vista (R$ 5.400,00)`);
        } else if (metodo === 'entrada') {
            console.log(`   Método: Entrada (R$ 1.000,00)`);
        } else {
            console.log(`   Método: Cartão (R$ 6.000,00)`);
        }
        console.log(`   Notificar admin: ${ADMIN_EMAIL}`);
        console.log(`\n`);

        // Buscar link de pagamento do PagBank
        const linkPagamento = response.data.links?.find(l => l.rel === 'checkout' || l.rel === 'pay')?.href 
            || response.data.charges?.[0]?.links?.find(l => l.rel === 'checkout' || l.rel === 'pay')?.href
            || null;
        
        const qrCodeUrl = response.data.charges?.[0]?.links?.find(l => l.rel === 'QRCode')?.href || null;

        const resposta = {
            sucesso: true,
            pedido_id: response.data.id,
            metodo: metodo || 'avista',
            valor_total: valorTotal / 100,
            link_pagamento: linkPagamento,  // Link para redirecionar cliente
            qr_code_url: qrCodeUrl,         // Fallback QR code
            pix_codigo: response.data.charges?.[0]?.qr_code?.text || null
        };

        res.json(resposta);

    } catch (error) {
        console.error('=== ERRO NO /api/criar-pagamento ===');
        console.error('Tipo:', error.name);
        console.error('Mensagem:', error.message);
        
        if (error.response) {
            console.error('Status HTTP:', error.response.status);
            console.error('Dados erro PagBank:', error.response.data);
        }
        
        if (error.code) {
            console.error('Código erro:', error.code);
        }
        
        console.error('Stack:', error.stack);
        console.error('=====================================');
        
        // Retornar erro detalhado mas seguro
        let mensagemErro = 'Erro ao criar pagamento';
        
        if (error.code === 'ECONNREFUSED') {
            mensagemErro = 'Não foi possível conectar ao PagBank';
        } else if (error.response?.status === 401) {
            mensagemErro = 'Token PagBank inválido ou expirado';
        } else if (error.response?.status === 400) {
            mensagemErro = 'Dados inválidos enviados ao PagBank';
        } else if (error.message?.includes('database') || error.message?.includes('postgres')) {
            mensagemErro = 'Erro no banco de dados';
        }
        
        res.status(500).json({
            sucesso: false,
            erro: mensagemErro,
            debug: {
                tipo: error.name,
                mensagem: error.message,
                pagbank_status: error.response?.status || null,
                pagbank_erro: error.response?.data || null
            }
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
            const metodo = pedido.metodo || 'avista';
            const novoStatus = status?.toUpperCase() || status;
            
            // Atualizar dados do pedido
            pedido.atualizado_em = new Date().toISOString();
            pedido.webhook_data = req.body;
            
            // Lógica de status conforme método de pagamento
            if (metodo === 'avista') {
                // Pagamento à vista - libera imediatamente quando pago
                if (novoStatus === 'PAID' || novoStatus === 'paid') {
                    pedido.status = 'PAID';
                    pedido.entrada_paga = true;
                    await salvarPedido(pedido);
                    await liberarAcessoCliente(pedido);
                    console.log(`✅ Pagamento à vista confirmado - Acesso liberado para: ${pedido.cliente}`);
                } else {
                    pedido.status = novoStatus;
                    await salvarPedido(pedido);
                }
            } else {
                // Pagamento parcelado - verificar etapas
                if (novoStatus === 'PAID' || novoStatus === 'paid') {
                    if (!pedido.entrada_paga) {
                        // Primeira etapa: Entrada paga
                        pedido.entrada_paga = true;
                        pedido.status = 'ENTRADA_PAID';
                        await salvarPedido(pedido);
                        console.log(`✅ Entrada confirmada - Aguardando pagamento do cartão: ${pedido.cliente}`);
                        // NÃO libera acesso ainda - aguarda cartão
                    } else if (!pedido.cartao_pago) {
                        // Segunda etapa: Cartão pago
                        pedido.cartao_pago = true;
                        pedido.status = 'PAID';
                        await salvarPedido(pedido);
                        await liberarAcessoCliente(pedido);
                        console.log(`✅ Pagamento completo (entrada + cartão) - Acesso liberado para: ${pedido.cliente}`);
                    }
                } else {
                    pedido.status = novoStatus;
                    await salvarPedido(pedido);
                }
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
        metodo: pedido.metodo,
        cliente: pedido.cliente,
        email: pedido.email,
        valor_total: pedido.valor_total,
        valor_pix: pedido.valor_pix,
        valor_restante: pedido.valor_restante,
        entrada_paga: pedido.entrada_paga,
        cartao_pago: pedido.cartao_pago,
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
        INSERT INTO pedidos (id, cliente, email, cpf, telefone, status, metodo, valor_total, entrada_paga, cartao_pago, criado_em, dados_pagbank)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            metodo = EXCLUDED.metodo,
            valor_total = EXCLUDED.valor_total,
            entrada_paga = EXCLUDED.entrada_paga,
            cartao_pago = EXCLUDED.cartao_pago,
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
        pedido.metodo || 'avista',
        pedido.valor_total || (pedido.metodo === 'avista' ? 540000 : 600000),
        pedido.entrada_paga || false,
        pedido.cartao_pago || false,
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
