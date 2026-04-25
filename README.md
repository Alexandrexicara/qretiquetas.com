# Sistema de Etiquetas - Alimentares

Sistema completo de geração de etiquetas com QR Code para controle interno e externo de produtos. Desenvolvido para funcionar offline na maquininha Alimentares/Kali.

---

## Funcionalidades

### 1. Cadastro de Clientes

- Clientes podem se cadastrar diretamente na tela de login
- Sistema valida usuários duplicados

### 2. Login Seguro

- Autenticação com usuário e senha
- Sessão persistente durante a navegação
- Logout com um clique

### 3. Sistema de Usuários/Admin

- **Clientes**: Podem gerar etiquetas e visualizar histórico
- **Administradores**: Acesso completo incluindo gerenciamento de usuários

### 4. Controle de Permissões

- Apenas administradores podem criar novos usuários
- Apenas administradores podem excluir usuários
- Badge visual identifica tipo de usuário no header

### 5. Geração de Etiquetas com QR Code

- **Etiquetas Internas** (azul): Controle de estoque
- **Etiquetas Externas** (verde): Produtos comerciais
- QR Code contém: ID, Produto, Lote, Validade, Tipo
- Campos adicionais para externo: Peso, Ingredientes, Fabricante

---

## Estrutura de Pastas

```text
qretiquetas.com/
├── index.html          # Arquivo principal (único necessário)
├── qr/                 # Pasta para biblioteca QR (opcional)
└── dados/              # Pasta para dados (uso futuro)
```

> **Nota**: O sistema usa CDN para a biblioteca QR Code, então funciona completamente online. Os dados são armazenados no LocalStorage do navegador.

---

## Como Usar

### Primeiro Acesso

1. Abra o `index.html` em qualquer navegador
2. Faça login com o usuário padrão administrador:
   - **Usuário**: `admin`
   - **Senha**: `admin123`

### Como Cliente

1. Clique em **"Cadastro"** na tela inicial
2. Preencha: Nome, Usuário e Senha
3. Faça login com suas credenciais
4. Gere etiquetas preenchendo:
   - Produto, Lote, Validade
   - Quantidade desejada
   - Cor da etiqueta
   - Tipo (Interno/Externo)
5. Clique em **"Gerar Etiquetas"**
6. Visualize e clique em **"Imprimir"**

### Como Administrador

1. Acesse a aba **"Admin"** no menu superior
2. Para criar novo usuário:
   - Preencha: Nome, Usuário, Senha, Tipo
   - Clique em **"Criar Usuário"**
3. Para excluir usuário:
   - Clique no botão 🗑️ ao lado do usuário

---

## Recursos Adicionais

- **Histórico**: Acesse etiquetas geradas anteriormente
- **Reimpressão**: Clique no botão 🖨️ no histórico para reimprimir
- **Estatísticas**: Dashboard com total de etiquetas (internas/externas)
- **Exclusão**: Remova etiquetas do histórico quando necessário

---

## Dados Armazenados

Todos os dados são salvos no **LocalStorage** do navegador:

| Chave | Conteúdo |
| -------- | -------- |
| `alimentares_users` | Lista de usuários cadastrados |
| `alimentares_labels` | Histórico de etiquetas geradas |
| `alimentares_currentUser` | Sessão do usuário logado |

---

## Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Navegadores mobile
- ✅ Funciona 100% offline após primeiro carregamento

---

## Segurança

- Senhas armazenadas em texto plano (adequado para ambiente local/fechado)
- Sessão expira ao fechar o navegador
- Recomendado alterar senha padrão do admin após primeiro acesso

---

## Suporte

Para dúvidas ou sugestões, entre em contato com o administrador do sistema.

---

**Versão**: 1.0  
**Data**: Abril 2026  
**Desenvolvido para**: Alimentares/Kali
