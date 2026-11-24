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

- `MERCADOPAGO_ENV=test`: obrigatório; outros valores impedem chamadas ao SDK.
- `MERCADOPAGO_ACCESS_TOKEN`: Access Token copiado da seção TESTE do painel.
- `MERCADOPAGO_TEST_SELLER_ID`: ID da conta de vendedor de teste da aplicação.
- `MERCADOPAGO_TEST_APP_ID`: ID da aplicação que gerou as credenciais de teste.
- `MERCADOPAGO_PUBLIC_KEY`: chave pública do ambiente de teste (não é usada pelo
  redirecionamento server-side do Checkout Pro).
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo de assinatura do webhook (obrigatório).
- `APP_URL`: URL HTTPS pública do Healthy Safely, acessível pelo Mercado Pago.

O SDK envia `X-Test-Token` em todas as chamadas e o checkout redireciona somente
para `sandbox_init_point`; o código não infere o ambiente pelo formato do token
nem usa o antigo `MP_ACCESS_TOKEN`. O Access Token nunca é enviado ao frontend.
A preferência e o pagamento também são conferidos contra o vendedor e a
aplicação de teste configurados. Os IDs acima devem corresponder a
`collector_id` e `client_id` retornados pelo Mercado Pago; não são credenciais.

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
