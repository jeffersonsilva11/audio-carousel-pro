# Plano de Migração: Lovable Cloud → Supabase Próprio + VPS

## Visão Geral

Este documento detalha a migração do Audisell do Lovable Cloud para um ambiente self-hosted com:
- **Frontend**: VPS na Hostinger (audissel.com)
- **Backend**: Supabase próprio (gratuito)
- **Domínio**: audissel.com

---

## 1. CRIAR PROJETO NO SUPABASE

### Passo a Passo Manual:

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Preencha:
   - **Name**: `audisell` (ou outro nome)
   - **Database Password**: Guarde bem essa senha!
   - **Region**: South America (São Paulo) - ou mais próximo de você
4. Aguarde a criação (~2 minutos)

### Anote as Credenciais:
Após criar, vá em **Project Settings > API** e anote:
- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon/public key**: `eyJhbGciOiJIUzI1...`
- **service_role key**: (guarde seguro, não use no frontend!)

---

## 2. EXECUTAR AS MIGRATIONS DO BANCO

### Opção A: Via Supabase Dashboard (Recomendado)

1. No Dashboard do Supabase, vá em **SQL Editor**
2. Execute cada arquivo de migration na ordem (pelo timestamp):
   - `20251229142541_*.sql` (primeiro)
   - `20251229231457_*.sql`
   - ... (seguir ordem cronológica)
   - `20251231013045_*.sql` (último)

Os arquivos estão em: `supabase/migrations/`

### Opção B: Via Supabase CLI (Avançado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_ID

# Rodar migrations
supabase db push
```

---

## 3. CRIAR STORAGE BUCKETS

No Dashboard do Supabase, vá em **Storage** e crie:

### Bucket 1: `carousel-images`
- **Public bucket**: SIM (toggle ON)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### Bucket 2: `slide-images`
- **Public bucket**: SIM (toggle ON)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### Configurar Policies (para cada bucket):
Vá em **Policies** e adicione:

```sql
-- Permitir leitura pública
CREATE POLICY "Public read" ON storage.objects
FOR SELECT USING (bucket_id = 'carousel-images');

-- Permitir upload para usuários autenticados
CREATE POLICY "Auth upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');

-- Permitir delete próprio
CREATE POLICY "Owner delete" ON storage.objects
FOR DELETE USING (bucket_id = 'carousel-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Repetir para `slide-images`.

---

## 4. CONFIGURAR SECRETS DAS EDGE FUNCTIONS

No Dashboard do Supabase, vá em **Project Settings > Edge Functions > Manage Secrets**

Adicione cada secret:

| Nome | Valor | Onde Obter |
|------|-------|------------|
| `OPENAI_WHISPER` | `sk-...` | [OpenAI API Keys](https://platform.openai.com/api-keys) |
| `GOOGLE_GEMINI` | `AIza...` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe > Webhooks > Signing secret |
| `RECAPTCHA_SECRET_KEY` | `6Lc...` | [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) |
| `LOVABLE_API_KEY` | (opcional) | Se não tiver, a tradução automática não funcionará |

---

## 5. DEPLOY DAS EDGE FUNCTIONS

### Via Supabase CLI:

```bash
# Na pasta do projeto
cd /home/user/audio-carousel-pro

# Deploy todas as functions
supabase functions deploy transcribe-audio
supabase functions deploy generate-script
supabase functions deploy generate-carousel-images
supabase functions deploy regenerate-without-watermark
supabase functions deploy check-subscription
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook
supabase functions deploy verify-recaptcha
supabase functions deploy log-auth-attempt
supabase functions deploy export-user-data
supabase functions deploy translate-content
```

### Verificar Deploy:
No Dashboard, vá em **Edge Functions** e confirme que todas as 12 funções estão listadas.

---

## 6. ATUALIZAR O FRONTEND

### Arquivo: `.env`

Substitua o conteúdo por:

```env
VITE_SUPABASE_URL="https://SEU_NOVO_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_NOVA_ANON_KEY"
```

### Arquivos que Precisam Atualização:

| Arquivo | O que alterar |
|---------|---------------|
| `.env` | URLs e keys do novo Supabase |
| `src/lib/plans.ts` | Price IDs do Stripe (linhas 9-10) |

---

## 7. CONFIGURAR STRIPE

### 7.1. Criar Produtos no Stripe

No [Stripe Dashboard](https://dashboard.stripe.com/products):

1. **Produto Starter**
   - Nome: Audisell Starter
   - Preço: R$ 29,90 / mês
   - Anote o `price_id`: `price_...`

2. **Produto Creator**
   - Nome: Audisell Creator
   - Preço: R$ 99,90 / mês
   - Anote o `price_id`: `price_...`

3. (Opcional) **Produto Agency**
   - Nome: Audisell Agency
   - Preço: R$ 199,90 / mês
   - Anote o `price_id`: `price_...`

### 7.2. Atualizar Price IDs no Código

Edite `src/lib/plans.ts`:

```typescript
export const STRIPE_PRICE_IDS = {
  starter: 'price_XXXXX',  // Cole seu price_id aqui
  creator: 'price_YYYYY',  // Cole seu price_id aqui
} as const;
```

### 7.3. Configurar Webhook no Stripe

1. Vá em [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **Add endpoint**
3. URL: `https://SEU_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
4. Eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Copie o **Signing secret** e adicione como `STRIPE_WEBHOOK_SECRET` nas Edge Functions

---

## 8. CONFIGURAR reCAPTCHA

### 8.1. Atualizar Domínios no Google

1. Acesse [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Selecione seu site
3. Em **Domains**, adicione:
   - `audissel.com`
   - `www.audissel.com`
4. Salve

### 8.2. Site Key no Frontend

O site key está hardcoded em dois arquivos:
- `src/hooks/useRecaptcha.ts` (linha 5)
- `src/components/auth/InteractiveCaptcha.tsx` (linha 5)

Se precisar trocar, atualize nesses dois locais.

---

## 9. BUILD E DEPLOY NA VPS

### 9.1. Build Local

```bash
cd /home/user/audio-carousel-pro

# Instalar dependências
npm install

# Build para produção
npm run build
```

### 9.2. Enviar para VPS

```bash
# Via SCP (substitua pelos seus dados)
scp -r dist/* usuario@SEU_IP_VPS:/var/www/audissel.com/

# Ou via SFTP/FTP usando FileZilla
```

### 9.3. Configurar Nginx na VPS

```nginx
server {
    listen 80;
    server_name audissel.com www.audissel.com;

    root /var/www/audissel.com;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 9.4. HTTPS com Certbot

```bash
sudo certbot --nginx -d audissel.com -d www.audissel.com
```

---

## 10. MIGRAR DADOS EXISTENTES

### Dados do Lovable Cloud que podem ser migrados:

1. **FAQs** (9 registros) - Via SQL ou painel admin
2. **Testimonials** (4 registros) - Via painel admin
3. **Trusted Companies** (5 registros) - Via painel admin
4. **Feature Flags** (6 registros) - Via SQL
5. **Landing Content** (26 registros) - Via SQL
6. **Usuário existente** - Precisará criar nova conta

### Exportar do Lovable (se tiver acesso):

```sql
-- No Lovable Supabase, execute:
SELECT * FROM faqs;
SELECT * FROM testimonials;
SELECT * FROM trusted_companies;
SELECT * FROM feature_flags;
SELECT * FROM landing_content;
```

---

## 11. CHECKLIST FINAL

### Antes de ir para Produção:

- [ ] Supabase criado e migrations executadas
- [ ] Storage buckets criados com policies
- [ ] Todas as 12 Edge Functions deployadas
- [ ] Secrets configuradas no Supabase
- [ ] `.env` atualizado com novo Supabase
- [ ] Price IDs do Stripe atualizados em `plans.ts`
- [ ] Webhook do Stripe configurado
- [ ] reCAPTCHA domínios atualizados
- [ ] Build gerado (`npm run build`)
- [ ] Arquivos enviados para VPS
- [ ] Nginx configurado com HTTPS
- [ ] Teste de login funcionando
- [ ] Teste de criação de carrossel funcionando
- [ ] Teste de pagamento (modo teste) funcionando

### Primeiro Admin:

Após criar sua conta, execute no SQL Editor do Supabase:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'SEU_EMAIL@exemplo.com';
```

---

## Arquivos de Referência

- **Migrations**: `supabase/migrations/*.sql`
- **Edge Functions**: `supabase/functions/*/index.ts`
- **Config Supabase**: `supabase/config.toml`
- **Variáveis de Ambiente**: `.env.example`

---

## Suporte

Se encontrar problemas:
1. Verifique os logs das Edge Functions no Dashboard
2. Verifique o Console do navegador (F12)
3. Verifique os logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
