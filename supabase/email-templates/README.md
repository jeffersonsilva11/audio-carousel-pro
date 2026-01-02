# Configuração de Email Templates - Supabase

Este diretório contém os templates de email que devem ser configurados no Supabase Dashboard.

## Templates Disponíveis

### 1. `confirmation.html` - Confirmação de Email
- **Tipo**: Confirm signup
- **Quando é enviado**: Após o registro de um novo usuário
- **Variáveis disponíveis**:
  - `{{ .Token }}` - Código OTP de 6 dígitos
  - `{{ .ConfirmationURL }}` - Link de confirmação automática
  - `{{ .SiteURL }}` - URL base do site

### 2. `recovery.html` - Recuperação de Senha
- **Tipo**: Reset password
- **Quando é enviado**: Quando o usuário solicita redefinição de senha
- **Variáveis disponíveis**:
  - `{{ .Token }}` - Código OTP de 6 dígitos
  - `{{ .ConfirmationURL }}` - Link de redefinição automática
  - `{{ .SiteURL }}` - URL base do site

## Como Configurar no Supabase Dashboard

### Passo 1: Acessar Configurações de Auth
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegue até **Authentication** > **Email Templates**

### Passo 2: Configurar Template de Confirmação
1. Selecione **Confirm signup**
2. Copie o conteúdo de `confirmation.html`
3. Cole no campo de template
4. Configurar:
   - **Subject**: `Confirme seu email - Audisell`
   - **From Name**: `Audisell`

### Passo 3: Configurar Template de Recuperação
1. Selecione **Reset password**
2. Copie o conteúdo de `recovery.html`
3. Cole no campo de template
4. Configurar:
   - **Subject**: `Recuperação de Senha - Audisell`
   - **From Name**: `Audisell`

### Passo 4: Configurar SMTP (Produção)
Para produção, configure um provedor SMTP:

1. Navegue até **Project Settings** > **Auth**
2. Na seção **SMTP Settings**, configure:
   - **Host**: (ex: smtp.sendgrid.net)
   - **Port**: 587
   - **Username**: (seu usuário SMTP)
   - **Password**: (sua senha SMTP)
   - **Sender Email**: noreply@audisell.com
   - **Sender Name**: Audisell

### Provedores SMTP Recomendados
- **SendGrid**: Gratuito até 100 emails/dia
- **Resend**: Gratuito até 3.000 emails/mês
- **Amazon SES**: Baixo custo para alto volume
- **Postmark**: Alta entregabilidade

## Configurações de Auth Recomendadas

No Supabase Dashboard > Authentication > Providers > Email:

```
✓ Enable Email Signup
✓ Enable Email Confirmations
✓ Enable Password Recovery
✓ Secure Email Change (require confirmation on both old and new email)

OTP Expiry: 86400 (24 horas para confirmação)
Password Reset OTP Expiry: 3600 (1 hora para reset)
```

## URLs de Redirecionamento

Configure os redirects no Dashboard:

- **Site URL**: `https://seudominio.com`
- **Redirect URLs**:
  - `https://seudominio.com/auth/callback`
  - `https://seudominio.com/auth/verify`
  - `https://seudominio.com/auth/reset-password`

## Variáveis de Ambiente

Certifique-se de ter as variáveis configuradas:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## Testando Localmente

Para testar emails localmente, o Supabase CLI oferece o InBucket:

```bash
supabase start
# Acesse http://localhost:54324 para ver os emails enviados
```
