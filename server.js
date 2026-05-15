const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('.')); // Serve arquivos estáticos

// Pasta de uploads (comprovantes PIX)
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'comprovantes');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do multer (upload de comprovante PIX)
const comprovanteStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const safeExt = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8);
        const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
        cb(null, unique);
    }
});
const uploadComprovante = multer({
    storage: comprovanteStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.mimetype);
        if (!ok) return cb(new Error('Tipo de arquivo não permitido. Envie JPG, PNG ou PDF.'));
        cb(null, true);
    }
});

// Configurações PagBank
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const PAGBANK_BASE_URL = 'https://api.pagbank.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'santossilvac990@gmail.com';

// Configurações PIX manual
const PIX_CHAVE = process.env.PIX_CHAVE || 'santossilvac990@gmail.com';
const PIX_TITULAR = process.env.PIX_TITULAR || 'Celio Santos Silva';
const PIX_BANCO = process.env.PIX_BANCO || '';

// Configurações Admin
const ADMIN_USUARIO = process.env.ADMIN_USUARIO || 'admin@qretiquetas.com';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'troque_essa_senha';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'troque_essa_secret_key_para_uma_string_aleatoria_longa';
const ADMIN_COOKIE = 'qadmin_session';

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
        INSERT INTO pedidos (
            id, cliente, email, cpf, telefone, status, metodo, valor_total,
            entrada_paga, cartao_pago, criado_em, dados_pagbank,
            tipo_fluxo, valor_pix, valor_cartao, pix_pago, comprovante_pix_path,
            link_cartao_admin, observacoes_admin, token_acesso
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20
        )
        ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            metodo = EXCLUDED.metodo,
            valor_total = EXCLUDED.valor_total,
            entrada_paga = EXCLUDED.entrada_paga,
            cartao_pago = EXCLUDED.cartao_pago,
            atualizado_em = CURRENT_TIMESTAMP,
            dados_pagbank = EXCLUDED.dados_pagbank,
            tipo_fluxo = EXCLUDED.tipo_fluxo,
            valor_pix = EXCLUDED.valor_pix,
            valor_cartao = EXCLUDED.valor_cartao,
            pix_pago = EXCLUDED.pix_pago,
            comprovante_pix_path = COALESCE(EXCLUDED.comprovante_pix_path, pedidos.comprovante_pix_path),
            link_cartao_admin = COALESCE(EXCLUDED.link_cartao_admin, pedidos.link_cartao_admin),
            observacoes_admin = COALESCE(EXCLUDED.observacoes_admin, pedidos.observacoes_admin),
            token_acesso = COALESCE(pedidos.token_acesso, EXCLUDED.token_acesso)
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
        JSON.stringify(pedido.dados_pagbank || {}),
        pedido.tipo_fluxo || 'pagbank',
        pedido.valor_pix || 0,
        pedido.valor_cartao || 0,
        pedido.pix_pago || false,
        pedido.comprovante_pix_path || null,
        pedido.link_cartao_admin || null,
        pedido.observacoes_admin || null,
        pedido.token_acesso || null
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

// ============================================
// FLUXO MANUAL: PIX (chave fixa) + Cartão (link admin)
// ============================================

function gerarToken() {
    return crypto.randomBytes(32).toString('hex');
}

function gerarIdPedidoManual() {
    return `MAN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function buscarPedidoPorToken(token) {
    const result = await pool.query('SELECT * FROM pedidos WHERE token_acesso = $1', [token]);
    return result.rows[0] || null;
}

function sanitizarPedidoPublico(pedido) {
    if (!pedido) return null;
    const cpfMascarado = pedido.cpf
        ? pedido.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.***.***-$4')
        : '';
    return {
        id: pedido.id,
        token: pedido.token_acesso,
        cliente: pedido.cliente,
        email: pedido.email,
        cpf: cpfMascarado,
        telefone: pedido.telefone,
        status: pedido.status,
        tipo_fluxo: pedido.tipo_fluxo,
        valor_total: pedido.valor_total,
        valor_pix: pedido.valor_pix,
        valor_cartao: pedido.valor_cartao,
        pix_pago: pedido.pix_pago,
        comprovante_url: pedido.comprovante_pix_path
            ? `/uploads/comprovantes/${path.basename(pedido.comprovante_pix_path)}`
            : null,
        link_cartao: pedido.link_cartao_admin || null,
        observacoes: pedido.observacoes_admin || null,
        criado_em: pedido.criado_em,
        atualizado_em: pedido.atualizado_em,
        pix: {
            chave: PIX_CHAVE,
            titular: PIX_TITULAR,
            banco: PIX_BANCO
        }
    };
}

// POST /api/manual/criar-pedido
app.post('/api/manual/criar-pedido', async (req, res) => {
    try {
        const { cliente, email, cpf, telefone, valor_pix, valor_cartao, metodo } = req.body || {};

        if (!cliente || !email || !telefone || !cpf) {
            return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        const pix = parseInt(valor_pix, 10);
        const cartao = parseInt(valor_cartao, 10);

        if (!Number.isFinite(pix) || !Number.isFinite(cartao) || pix < 100 || cartao < 100) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Valores PIX e Cartão são obrigatórios e cada um deve ser maior que R$ 1,00.'
            });
        }

        // Total do plano manual: cliente decide a divisão, total = R$ 6.000,00 (600000 centavos)
        const valorTotalEsperado = 600000;
        if (pix + cartao !== valorTotalEsperado) {
            return res.status(400).json({
                sucesso: false,
                erro: `A soma do PIX (R$ ${(pix / 100).toFixed(2)}) com o Cartão (R$ ${(cartao / 100).toFixed(2)}) deve ser exatamente R$ ${(valorTotalEsperado / 100).toFixed(2)}.`
            });
        }

        const id = gerarIdPedidoManual();
        const token = gerarToken();

        const pedido = {
            id,
            cliente,
            email,
            cpf: (cpf || '').replace(/\D/g, ''),
            telefone: (telefone || '').replace(/\D/g, ''),
            status: 'PENDING_PIX',
            metodo: metodo || 'manual',
            valor_total: valorTotalEsperado,
            entrada_paga: false,
            cartao_pago: false,
            criado_em: new Date().toISOString(),
            dados_pagbank: {},
            tipo_fluxo: 'manual',
            valor_pix: pix,
            valor_cartao: cartao,
            pix_pago: false,
            comprovante_pix_path: null,
            link_cartao_admin: null,
            observacoes_admin: null,
            token_acesso: token
        };

        await salvarPedido(pedido);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        console.log(`\n🛍️  NOVO PEDIDO MANUAL`);
        console.log(`   ID: ${id}`);
        console.log(`   Cliente: ${cliente} <${email}>`);
        console.log(`   PIX: R$ ${(pix / 100).toFixed(2)}  |  Cartão: R$ ${(cartao / 100).toFixed(2)}`);
        console.log(`   Link cliente: ${baseUrl}/pedido/${token}`);
        console.log(`   Painel admin: ${baseUrl}/admin\n`);

        res.json({
            sucesso: true,
            pedido_id: id,
            token,
            url_pedido: `/pedido/${token}`,
            pix: { chave: PIX_CHAVE, titular: PIX_TITULAR, banco: PIX_BANCO },
            valor_pix: pix,
            valor_cartao: cartao,
            valor_total: valorTotalEsperado
        });
    } catch (error) {
        console.error('Erro em /api/manual/criar-pedido:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro ao criar pedido manual.' });
    }
});

// POST /api/manual/upload-comprovante/:token
app.post('/api/manual/upload-comprovante/:token', (req, res) => {
    uploadComprovante.single('comprovante')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ sucesso: false, erro: err.message || 'Falha no upload.' });
        }
        try {
            const { token } = req.params;
            const pedido = await buscarPedidoPorToken(token);
            if (!pedido) {
                return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
            }
            if (pedido.tipo_fluxo !== 'manual') {
                return res.status(400).json({ sucesso: false, erro: 'Pedido não pertence ao fluxo manual.' });
            }
            if (!req.file) {
                return res.status(400).json({ sucesso: false, erro: 'Nenhum arquivo enviado.' });
            }

            // Remove comprovante anterior, se houver
            if (pedido.comprovante_pix_path) {
                try { fs.unlinkSync(pedido.comprovante_pix_path); } catch (_) { /* ignore */ }
            }

            pedido.comprovante_pix_path = req.file.path;
            pedido.status = 'PIX_ENVIADO';
            await salvarPedido(pedido);

            console.log(`📄 Comprovante PIX recebido para ${pedido.id} (${pedido.cliente})`);

            res.json({
                sucesso: true,
                comprovante_url: `/uploads/comprovantes/${path.basename(req.file.path)}`,
                status: pedido.status
            });
        } catch (e) {
            console.error('Erro upload comprovante:', e);
            res.status(500).json({ sucesso: false, erro: 'Erro ao salvar comprovante.' });
        }
    });
});

// GET /api/manual/pedido/:token  -> dados públicos para o cliente
app.get('/api/manual/pedido/:token', async (req, res) => {
    try {
        const pedido = await buscarPedidoPorToken(req.params.token);
        if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
        res.json(sanitizarPedidoPublico(pedido));
    } catch (e) {
        console.error('Erro consulta pedido publico:', e);
        res.status(500).json({ erro: 'Erro ao consultar pedido' });
    }
});

// Serve a página do pedido (link único)
app.get('/pedido/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'pedido-status.html'));
});

// ============================================
// TRIAL DO CLIENTE: verificar se um e-mail/usuário está PAGO
// (usado pelo cadastro.html para liberar acesso sem cronômetro)
// ============================================
app.get('/api/cliente/check-pago', async (req, res) => {
    try {
        const identificador = (req.query.email || req.query.user || '').trim().toLowerCase();
        if (!identificador) return res.json({ pago: false });

        // Considera pago se existir um usuario ativo OU um pedido PAID com esse email/usuario
        const r = await pool.query(
            `SELECT 1 FROM usuarios WHERE LOWER(email) = $1 AND ativo = true
             UNION
             SELECT 1 FROM pedidos WHERE LOWER(email) = $1 AND status = 'PAID'
             LIMIT 1`,
            [identificador]
        );
        res.json({ pago: r.rowCount > 0 });
    } catch (e) {
        console.error('Erro check-pago:', e);
        res.json({ pago: false });
    }
});

// ============================================
// PAINEL ADMIN
// ============================================

function assinarSessaoAdmin(payload) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('base64url');
    return `${data}.${sig}`;
}

function validarSessaoAdmin(cookie) {
    if (!cookie || typeof cookie !== 'string' || !cookie.includes('.')) return null;
    const [data, sig] = cookie.split('.');
    const esperado = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('base64url');
    try {
        if (sig.length !== esperado.length) return null;
        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
        if (!payload.exp || payload.exp < Date.now()) return null;
        return payload;
    } catch (_) {
        return null;
    }
}

function requireAdmin(req, res, next) {
    const sess = validarSessaoAdmin(req.cookies && req.cookies[ADMIN_COOKIE]);
    if (!sess) {
        return res.status(401).json({ erro: 'Não autenticado' });
    }
    req.admin = sess;
    next();
}

// Login admin
app.post('/api/admin/login', (req, res) => {
    const { usuario, senha } = req.body || {};
    if (!usuario || !senha) {
        return res.status(400).json({ sucesso: false, erro: 'Informe usuário e senha.' });
    }
    if (usuario !== ADMIN_USUARIO || senha !== ADMIN_SENHA) {
        return res.status(401).json({ sucesso: false, erro: 'Usuário ou senha inválidos.' });
    }
    const exp = Date.now() + (1000 * 60 * 60 * 12); // 12h
    const token = assinarSessaoAdmin({ u: usuario, exp });
    res.cookie(ADMIN_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 12
    });
    res.json({ sucesso: true });
});

// Logout admin
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie(ADMIN_COOKIE);
    res.json({ sucesso: true });
});

// Listar pedidos
app.get('/api/admin/pedidos', requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM pedidos';
        const params = [];
        if (status && status !== 'todos') {
            params.push(status);
            query += ` WHERE status = $${params.length}`;
        }
        query += ' ORDER BY criado_em DESC LIMIT 500';
        const result = await pool.query(query, params);
        const lista = result.rows.map((p) => ({
            id: p.id,
            cliente: p.cliente,
            email: p.email,
            cpf: p.cpf,
            telefone: p.telefone,
            status: p.status,
            tipo_fluxo: p.tipo_fluxo,
            metodo: p.metodo,
            valor_total: p.valor_total,
            valor_pix: p.valor_pix,
            valor_cartao: p.valor_cartao,
            pix_pago: p.pix_pago,
            cartao_pago: p.cartao_pago,
            comprovante_url: p.comprovante_pix_path
                ? `/uploads/comprovantes/${path.basename(p.comprovante_pix_path)}`
                : null,
            link_cartao: p.link_cartao_admin,
            observacoes: p.observacoes_admin,
            token_acesso: p.token_acesso,
            criado_em: p.criado_em,
            atualizado_em: p.atualizado_em
        }));
        res.json(lista);
    } catch (e) {
        console.error('Erro listar pedidos admin:', e);
        res.status(500).json({ erro: 'Erro ao listar pedidos' });
    }
});

// Confirmar PIX recebido
app.post('/api/admin/pedido/:id/confirmar-pix', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE pedidos
             SET pix_pago = true,
                 status = 'PIX_CONFIRMADO_AGUARDA_CARTAO',
                 entrada_paga = true,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1 AND tipo_fluxo = 'manual'
             RETURNING id, status`,
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ sucesso: false, erro: 'Pedido manual não encontrado.' });
        res.json({ sucesso: true, status: r.rows[0].status });
    } catch (e) {
        console.error('Erro confirmar pix:', e);
        res.status(500).json({ sucesso: false, erro: 'Erro interno.' });
    }
});

// Enviar link de cartão
app.post('/api/admin/pedido/:id/enviar-link-cartao', requireAdmin, async (req, res) => {
    try {
        const { link_cartao, observacoes } = req.body || {};
        if (!link_cartao || !/^https?:\/\//i.test(link_cartao)) {
            return res.status(400).json({ sucesso: false, erro: 'Informe um link válido (http/https).' });
        }
        const r = await pool.query(
            `UPDATE pedidos
             SET link_cartao_admin = $2,
                 observacoes_admin = COALESCE($3, observacoes_admin),
                 status = 'LINK_CARTAO_ENVIADO',
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1 AND tipo_fluxo = 'manual'
             RETURNING id, status, link_cartao_admin`,
            [req.params.id, link_cartao, observacoes || null]
        );
        if (r.rowCount === 0) return res.status(404).json({ sucesso: false, erro: 'Pedido manual não encontrado.' });
        res.json({ sucesso: true, status: r.rows[0].status, link_cartao: r.rows[0].link_cartao_admin });
    } catch (e) {
        console.error('Erro enviar link:', e);
        res.status(500).json({ sucesso: false, erro: 'Erro interno.' });
    }
});

// Confirmar pagamento total e liberar acesso
app.post('/api/admin/pedido/:id/confirmar-pagamento', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE pedidos
             SET status = 'PAID',
                 cartao_pago = true,
                 pix_pago = true,
                 entrada_paga = true,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
        await liberarAcessoCliente(r.rows[0]);
        res.json({ sucesso: true, status: r.rows[0].status });
    } catch (e) {
        console.error('Erro confirmar pagamento:', e);
        res.status(500).json({ sucesso: false, erro: 'Erro interno.' });
    }
});

// Cancelar pedido
app.post('/api/admin/pedido/:id/cancelar', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE pedidos
             SET status = 'CANCELADO',
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, status`,
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
        res.json({ sucesso: true, status: r.rows[0].status });
    } catch (e) {
        console.error('Erro cancelar:', e);
        res.status(500).json({ sucesso: false, erro: 'Erro interno.' });
    }
});

// Rotas das páginas de admin (HTML estático - frontend faz a checagem do cookie)
app.get('/admin', (req, res) => {
    const sess = validarSessaoAdmin(req.cookies && req.cookies[ADMIN_COOKIE]);
    if (sess) {
        res.sendFile(path.join(__dirname, 'admin.html'));
    } else {
        res.sendFile(path.join(__dirname, 'admin-login.html'));
    }
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Landing page: http://localhost:${PORT}/index.html`);
    console.log(`💳 Checkout: http://localhost:${PORT}/checkout.html`);
    console.log(`🔔 Webhook URL: http://localhost:${PORT}/api/webhook/pagbank`);
    console.log(`🔐 Painel admin: http://localhost:${PORT}/admin`);
});
