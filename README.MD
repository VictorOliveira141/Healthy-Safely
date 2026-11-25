# 🌿 Healthy Safely

Sistema de Monitoramento e Progressão de Hábitos saudáveis — MVC + Node.js + MySQL.

## 🚀 Como rodar o projeto

### Pré-requisitos
- Node.js >= 18.0.0
- MySQL >= 8.0
- .env com credenciais

### 1. Instalar dependências
npm install

### 2. Rodar o servidor
node app

### Mercado Pago (somente Sandbox)

O Checkout Pro cria uma cobrança única de R$ 11,99 e libera o Premium por 30
dias após confirmação; a renovação é manual. Configure no ambiente:

- `MP_ACCESS_TOKEN` (ou `MERCADOPAGO_ACCESS_TOKEN`): Access Token de uma
  **conta de vendedor de teste**. O app consulta `/users/me` e recusa qualquer
  token sem a tag `test_user`, então não há como cobrar dinheiro real.
- `APP_URL`: URL HTTPS pública do Healthy Safely (para o retorno do checkout).
- `MERCADOPAGO_ENV` (opcional, padrão `test`): qualquer outro valor desliga.
- `MERCADOPAGO_TEST_SELLER_ID` / `MERCADOPAGO_TEST_APP_ID` (opcionais): se
  ausentes, são extraídos do próprio token.
- `MP_WEBHOOK_SECRET` (opcional): com ele, o webhook é registrado; sem ele, o
  pagamento é confirmado quando o comprador volta para `/assinatura/retorno`.

Para pagar, abra o checkout logado com a **conta compradora de teste** e use
um cartão de teste (ex.: Mastercard 5031 4332 1540 6351, CVV 123, validade
11/30, titular `APRO`, CPF 12345678909).

Antes de iniciar, aplique a migração aditiva
`app/config/database/mercadopago-checkout.sql` no banco existente. Ela preserva
os dados e cria os registros de pedidos/pagamentos e a expiração do Premium;
não use `atualizar-banco.sql` para esta integração.
Assinaturas recorrentes legadas não são canceladas por esta migração. Verifique
e cancele-as no painel do Mercado Pago antes de desativar a integração antiga;
as credenciais Sandbox não podem cancelar contratos de produção.

## 🛠️ Tecnologias
- **Back-end:** Node.js, Express.js, Javascript
- **Views:** EJS
- **Banco:** MySQL com mysql2
- **Validação:** express-validator
- **Senhas:** bcryptjs, brevo
- **Sessão:** express-session
