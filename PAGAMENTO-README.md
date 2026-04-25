# Sistema de Pagamentos - Alimentares

## Requisitos
- Node.js 16+
- PostgreSQL 12+

## Configuração do Banco de Dados

### 1. Criar banco PostgreSQL
```bash
# Acesse o psql
psql -U postgres

# Crie o banco
CREATE DATABASE alimentares;

# Saia
\q
```

### 2. Criar tabelas
```bash
psql -U postgres -d alimentares -f database.sql
```

Ou dentro do psql:
```bash
psql -U postgres
\c alimentares
\i database.sql
```

### 3. Configurar .env
Copie `.env.example` para `.env` e configure:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do PostgreSQL:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alimentares
DB_USER=postgres
DB_PASSWORD=sua_senha
```

## Como iniciar o servidor

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar servidor
```bash
npm start
```

Ou em modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

### 3. Acessar
- Landing page: http://localhost:3000/index.html
- Checkout: http://localhost:3000/checkout.html

## Fluxo de Pagamento

1. Cliente acessa **checkout.html**
2. Preenche dados (nome, email, CPF, telefone)
3. Clica em "Gerar Pagamento PIX"
4. Sistema chama API PagBank e gera QR Code
5. Cliente escaneia e paga
6. PagBank envia webhook para `/api/webhook/pagbank`
7. Sistema libera acesso automaticamente

## Endpoints API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/criar-pagamento` | POST | Cria pedido de pagamento |
| `/api/webhook/pagbank` | POST | Recebe confirmação do PagBank |
| `/api/pedido/:id` | GET | Consulta status do pedido |
| `/api/pedidos` | GET | Lista todos os pedidos |

## Webhook URL (configurar no PagBank)

```
https://seu-dominio.com/api/webhook/pagbank
```

Em desenvolvimento local, use ngrok para expor o servidor:
```bash
npx ngrok http 3000
```

## Credenciais

As credenciais estão no arquivo `.env`:
- `PAGBANK_TOKEN`: Token da API PagBank

**IMPORTANTE**: Nunca commit o arquivo `.env` em repositórios públicos!

## Arquivos Criados

- `server.js` - Backend Node.js com Express
- `checkout.html` - Página de pagamento
- `.env` - Configurações e credenciais
- `package.json` - Dependências

## Produção

Para deploy em produção, configure:
1. Variáveis de ambiente no servidor
2. HTTPS obrigatório para webhooks
3. Banco de dados real (substituir JSON files)
