# CASOS DE TESTE - AUDISELL
## Documento para QA Manual

**Versão:** 1.0
**Data:** Janeiro 2026
**Ambiente de Teste:** Produção (audissel.com)

---

## CONFIGURAÇÃO PRÉ-TESTE

### Contas de Teste Necessárias
| Conta | Plano | Email Sugerido |
|-------|-------|----------------|
| Conta Free | Free | qa.free@teste.com |
| Conta Starter | Starter | qa.starter@teste.com |
| Conta Creator | Creator | qa.creator@teste.com |
| Conta Admin | Admin | qa.admin@teste.com |

### Cupons de Teste
| Cupom | Desconto | Uso |
|-------|----------|-----|
| QA_STARTER_100 | 100% | Testar upgrade para Starter |
| QA_CREATOR_100 | 100% | Testar upgrade para Creator |

### Materiais de Teste
- Arquivo de áudio MP3 (30 segundos) - conteúdo qualquer
- Arquivo de áudio WAV (1 minuto)
- Arquivo de áudio muito grande (>10MB)
- Arquivo de formato inválido (.txt renomeado para .mp3)
- Imagens PNG/JPG para upload de slides

---

# PARTE 1: TESTES DE USUÁRIO COMUM

## 1. AUTENTICAÇÃO E CADASTRO

### TC-AUTH-001: Cadastro com Email e Senha
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-001 |
| **Prioridade** | Alta |
| **Pré-condições** | Nenhuma conta existente com o email de teste |

**Passos:**
1. Acessar audissel.com
2. Clicar em "Começar Grátis" ou "Criar Conta"
3. Preencher nome completo
4. Preencher email válido
5. Preencher senha (mínimo 6 caracteres)
6. Clicar em "Criar Conta"

**Resultado Esperado:**
- [x] Usuário é redirecionado para página de verificação de email
- [x] Email de verificação é recebido em até 2 minutos
- [x] Toast de sucesso é exibido

---

### TC-AUTH-002: Verificação de Email
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-002 |
| **Prioridade** | Alta |
| **Pré-condições** | TC-AUTH-001 concluído |

**Passos:**
1. Abrir email de verificação recebido
2. Copiar código de 6 dígitos
3. Inserir código na página de verificação
4. Clicar em "Verificar"

**Resultado Esperado:**
- [x] Código é validado com sucesso
- [x] Usuário é redirecionado para o Dashboard
- [x] Modal de onboarding é exibido (primeira vez)

---

### TC-AUTH-003: Reenvio de Código de Verificação (Mesmo Código < 24h)
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-003 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário na tela de verificação |

**Passos:**
1. Aguardar cooldown de 60 segundos
2. Clicar em "Reenviar código"
3. Verificar email recebido

**Resultado Esperado:**
- [x] Mesmo código é reenviado (não gera novo)
- [x] Toast indica "Código reenviado"
- [x] Cooldown de 60s é reiniciado

---

### TC-AUTH-004: Login com Email e Senha
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-004 |
| **Prioridade** | Alta |
| **Pré-condições** | Conta existente e verificada |

**Passos:**
1. Acessar audissel.com
2. Clicar em "Entrar"
3. Inserir email cadastrado
4. Inserir senha
5. Clicar em "Entrar"

**Resultado Esperado:**
- [x] Login realizado com sucesso
- [x] Redirecionamento para Dashboard
- [x] Nome do usuário exibido no header

---

### TC-AUTH-005: Login com Google
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-005 |
| **Prioridade** | Alta |
| **Pré-condições** | Conta Google válida |

**Passos:**
1. Acessar página de login
2. Clicar em "Continuar com Google"
3. Selecionar conta Google
4. Autorizar acesso

**Resultado Esperado:**
- [x] Popup do Google é aberto
- [x] Após autorização, usuário é logado
- [x] Redirecionamento para Dashboard
- [x] Perfil preenchido com dados do Google

---

### TC-AUTH-006: Recuperação de Senha
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-006 |
| **Prioridade** | Média |
| **Pré-condições** | Conta existente |

**Passos:**
1. Acessar página de login
2. Clicar em "Esqueci minha senha"
3. Inserir email cadastrado
4. Clicar em "Enviar"
5. Abrir email recebido
6. Clicar no link de recuperação
7. Inserir nova senha
8. Confirmar nova senha
9. Clicar em "Salvar"

**Resultado Esperado:**
- [x] Email de recuperação enviado
- [x] Link redireciona para página de nova senha
- [x] Senha alterada com sucesso
- [x] Possível fazer login com nova senha

---

### TC-AUTH-007: Logout
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-007 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Clicar no avatar/menu do usuário
2. Clicar em "Sair"

**Resultado Esperado:**
- [x] Sessão encerrada
- [x] Redirecionamento para landing page
- [x] Não é possível acessar Dashboard sem novo login

---

### TC-AUTH-008: Proteção de Brute Force
| Campo | Valor |
|-------|-------|
| **ID** | TC-AUTH-008 |
| **Prioridade** | Alta |
| **Pré-condições** | Conta existente |

**Passos:**
1. Tentar login com senha errada 3 vezes consecutivas

**Resultado Esperado:**
- [x] Após 3 tentativas, conta é bloqueada por 15 minutos
- [x] Mensagem de erro indica bloqueio temporário

---

## 2. ONBOARDING

### TC-ONB-001: Fluxo de Onboarding Completo
| Campo | Valor |
|-------|-------|
| **ID** | TC-ONB-001 |
| **Prioridade** | Média |
| **Pré-condições** | Primeira vez no Dashboard |

**Passos:**
1. Observar modal de onboarding
2. Seguir cada passo do tutorial
3. Clicar em "Próximo" em cada etapa
4. Finalizar onboarding

**Resultado Esperado:**
- [x] Modal exibe todas as etapas
- [x] Usuário pode navegar entre etapas
- [x] Ao finalizar, modal não aparece novamente

---

## 3. CRIAÇÃO DE CARROSSEL - PLANO FREE

### TC-CAR-FREE-001: Criar Primeiro Carrossel (Plano Free)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-FREE-001 |
| **Prioridade** | Crítica |
| **Pré-condições** | Usuário logado no plano Free, sem carrosséis criados hoje |

**Passos:**
1. Acessar Dashboard
2. Clicar em "Criar Carrossel" ou "+"
3. Na Etapa 1 - Fazer upload de áudio MP3 (30s)
4. Selecionar tom de voz (ex: "Profissional")
5. Selecionar modo de texto (ex: "Padrão")
6. Clicar em "Gerar Carrossel"
7. Aguardar processamento (transcribing → scripting → generating)
8. Visualizar resultado

**Resultado Esperado:**
- [x] Upload aceita arquivo de áudio
- [x] Progresso é exibido em tempo real
- [x] Carrossel é gerado com slides
- [x] Preview é exibido
- [x] Contador de uso atualiza para 1/1

---

### TC-CAR-FREE-002: Limite Diário Atingido (Plano Free)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-FREE-002 |
| **Prioridade** | Alta |
| **Pré-condições** | TC-CAR-FREE-001 concluído (limite atingido) |

**Passos:**
1. Tentar criar novo carrossel
2. Fazer upload de áudio
3. Tentar gerar

**Resultado Esperado:**
- [x] Sistema bloqueia criação
- [x] Mensagem indica limite atingido
- [x] Opção de upgrade é oferecida
- [x] Indica quando limite reseta (meia-noite)

---

### TC-CAR-FREE-003: Marca d'Água no Plano Free
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-FREE-003 |
| **Prioridade** | Alta |
| **Pré-condições** | Carrossel gerado no plano Free |

**Passos:**
1. Acessar carrossel gerado
2. Visualizar slides
3. Baixar imagens

**Resultado Esperado:**
- [x] Marca d'água "Audisell" visível em todos os slides
- [x] Marca d'água presente nas imagens baixadas

---

### TC-CAR-FREE-004: Download Individual (Plano Free)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-FREE-004 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel gerado |

**Passos:**
1. Acessar detalhes do carrossel
2. Clicar em download de um slide individual

**Resultado Esperado:**
- [x] Imagem é baixada
- [x] Contém marca d'água
- [x] Formato PNG/JPG correto

---

### TC-CAR-FREE-005: ZIP Bloqueado (Plano Free)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-FREE-005 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel gerado no plano Free |

**Passos:**
1. Tentar baixar todos os slides em ZIP

**Resultado Esperado:**
- [x] Opção está desabilitada ou não aparece
- [x] Mensagem indica que é recurso Pro

---

## 4. CRIAÇÃO DE CARROSSEL - PLANO STARTER

### TC-CAR-STARTER-001: Criar Carrossel (Plano Starter)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-STARTER-001 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuário logado no plano Starter |

**Passos:**
1. Criar carrossel normalmente
2. Verificar slides gerados

**Resultado Esperado:**
- [x] Carrossel gerado SEM marca d'água
- [x] Limite semanal de 3 carrosséis
- [x] Acesso ao editor visual

---

### TC-CAR-STARTER-002: Editor Visual (Plano Starter)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-STARTER-002 |
| **Prioridade** | Alta |
| **Pré-condições** | Carrossel gerado no Starter |

**Passos:**
1. Acessar carrossel gerado
2. Clicar em "Editar"
3. Modificar texto de um slide
4. Salvar alterações

**Resultado Esperado:**
- [x] Editor é acessível
- [x] Texto pode ser editado
- [x] Alterações são salvas
- [x] Preview atualiza em tempo real

---

### TC-CAR-STARTER-003: Download ZIP (Plano Starter)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-STARTER-003 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel gerado no Starter |

**Passos:**
1. Clicar em "Baixar ZIP"
2. Abrir arquivo baixado

**Resultado Esperado:**
- [x] ZIP é baixado
- [x] Contém todas as imagens
- [x] Imagens sem marca d'água

---

### TC-CAR-STARTER-004: Histórico (Plano Starter)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-STARTER-004 |
| **Prioridade** | Média |
| **Pré-condições** | Múltiplos carrosséis criados |

**Passos:**
1. Acessar seção "Histórico"
2. Verificar lista de carrosséis

**Resultado Esperado:**
- [x] Todos os carrosséis são listados
- [x] Possível filtrar/buscar
- [x] Possível acessar carrossel antigo

---

## 5. CRIAÇÃO DE CARROSSEL - PLANO CREATOR

### TC-CAR-CREATOR-001: Limite Diário Creator
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-CREATOR-001 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuário logado no plano Creator |

**Passos:**
1. Verificar contador de carrosséis no Dashboard
2. Criar até 8 carrosséis no mesmo dia

**Resultado Esperado:**
- [x] Limite de 8 carrosséis/dia
- [x] Contador atualiza corretamente
- [x] Bloqueia após 8º carrossel

---

### TC-CAR-CREATOR-002: Fontes Customizadas (Plano Creator)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-CREATOR-002 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel em edição no Creator |

**Passos:**
1. Acessar editor
2. Selecionar opção de fonte
3. Escolher fonte diferente da padrão
4. Salvar

**Resultado Esperado:**
- [x] Múltiplas fontes disponíveis
- [x] Fonte é aplicada aos slides
- [x] Preview atualiza

---

### TC-CAR-CREATOR-003: Gradientes (Plano Creator)
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-CREATOR-003 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel em edição no Creator |

**Passos:**
1. Acessar opções de fundo
2. Selecionar gradiente
3. Escolher cores
4. Aplicar

**Resultado Esperado:**
- [x] Opção de gradiente disponível
- [x] Cores personalizáveis
- [x] Gradiente aplicado aos slides

---

### TC-CAR-CREATOR-004: Upload de Imagens por Slide
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-CREATOR-004 |
| **Prioridade** | Média |
| **Pré-condições** | Plano Creator |

**Passos:**
1. Editar carrossel
2. Selecionar slide
3. Fazer upload de imagem de fundo
4. Salvar

**Resultado Esperado:**
- [x] Upload aceita PNG/JPG
- [x] Imagem é aplicada como fundo do slide
- [x] Imagem é salva com o carrossel

---

### TC-CAR-CREATOR-005: Templates Premium
| Campo | Valor |
|-------|-------|
| **ID** | TC-CAR-CREATOR-005 |
| **Prioridade** | Média |
| **Pré-condições** | Plano Creator |

**Passos:**
1. Na criação, selecionar template
2. Verificar templates disponíveis

**Resultado Esperado:**
- [x] Templates premium desbloqueados
- [x] Todos os templates selecionáveis
- [x] Preview do template funciona

---

## 6. FLUXO DE PAGAMENTO E UPGRADE

### TC-PAY-001: Visualizar Planos
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-001 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuário logado (qualquer plano) |

**Passos:**
1. Clicar em "Ver Planos" ou "Upgrade"
2. Visualizar modal/página de planos

**Resultado Esperado:**
- [x] Todos os planos são exibidos
- [x] Preços corretos (BRL)
- [x] Features de cada plano listadas
- [x] Plano atual destacado

---

### TC-PAY-002: Checkout Stripe - Sem Cupom
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-002 |
| **Prioridade** | Crítica |
| **Pré-condições** | Plano Free, cartão de teste Stripe |

**Passos:**
1. Selecionar plano Starter
2. Clicar em "Assinar"
3. Ser redirecionado para Stripe Checkout
4. Preencher dados do cartão (4242 4242 4242 4242)
5. Confirmar pagamento

**Resultado Esperado:**
- [x] Redirecionamento para Stripe funciona
- [x] Checkout exibe valor correto
- [x] Pagamento processado
- [x] Redirecionamento de volta ao app
- [x] Plano atualizado imediatamente

---

### TC-PAY-003: Checkout com Cupom de Desconto
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-003 |
| **Prioridade** | Alta |
| **Pré-condições** | Cupom válido criado |

**Passos:**
1. Selecionar plano
2. Inserir código do cupom
3. Clicar em "Aplicar"
4. Verificar desconto
5. Prosseguir com checkout

**Resultado Esperado:**
- [x] Cupom é validado
- [x] Desconto é exibido
- [x] Valor final correto no Stripe
- [x] Cupom registrado no histórico

---

### TC-PAY-004: Cupom Inválido
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-004 |
| **Prioridade** | Média |
| **Pré-condições** | Nenhuma |

**Passos:**
1. Inserir cupom inexistente "INVALIDO123"
2. Clicar em "Aplicar"

**Resultado Esperado:**
- [x] Erro é exibido
- [x] Cupom não é aplicado
- [x] Mensagem clara de cupom inválido

---

### TC-PAY-005: Portal do Cliente Stripe
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-005 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuário com assinatura ativa |

**Passos:**
1. Acessar Dashboard
2. Clicar em "Gerenciar Assinatura"
3. Ser redirecionado para Portal Stripe

**Resultado Esperado:**
- [x] Portal abre corretamente
- [x] Exibe dados da assinatura
- [x] Possível atualizar cartão
- [x] Possível cancelar assinatura

---

### TC-PAY-006: Cancelamento de Assinatura
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-006 |
| **Prioridade** | Alta |
| **Pré-condições** | Assinatura ativa |

**Passos:**
1. Acessar Portal Stripe
2. Clicar em "Cancelar assinatura"
3. Confirmar cancelamento
4. Voltar ao app

**Resultado Esperado:**
- [x] Cancelamento registrado
- [x] Assinatura continua até fim do período
- [x] Notificação de cancelamento exibida
- [x] Dashboard mostra dias restantes

---

### TC-PAY-007: Downgrade após Expiração
| Campo | Valor |
|-------|-------|
| **ID** | TC-PAY-007 |
| **Prioridade** | Alta |
| **Pré-condições** | Assinatura cancelada e expirada |

**Passos:**
1. Aguardar expiração (ou simular via admin)
2. Acessar Dashboard

**Resultado Esperado:**
- [x] Plano volta para Free
- [x] Limites de Free aplicados
- [x] Marca d'água reaparece em novos carrosséis
- [x] Histórico mantido (somente leitura)

---

## 7. EXIT INTENT E GROWTH

### TC-GROWTH-001: Exit Intent Popup
| Campo | Valor |
|-------|-------|
| **ID** | TC-GROWTH-001 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário NÃO logado na landing page |

**Passos:**
1. Acessar landing page
2. Mover mouse para fora da janela (intenção de sair)

**Resultado Esperado:**
- [x] Popup aparece
- [x] Oferece cadastro com bônus
- [x] Campo de email funciona
- [x] Não aparece para usuários logados

---

### TC-GROWTH-002: Bônus do Exit Intent
| Campo | Valor |
|-------|-------|
| **ID** | TC-GROWTH-002 |
| **Prioridade** | Média |
| **Pré-condições** | TC-GROWTH-001 concluído |

**Passos:**
1. Cadastrar via popup do exit intent
2. Verificar conta criada
3. Acessar Dashboard

**Resultado Esperado:**
- [x] Conta criada com source "exit_intent"
- [x] 3 carrosséis bônus creditados
- [x] Limite efetivo: 1 (normal) + 3 (bônus) = 4

---

### TC-GROWTH-003: Social Proof Toast
| Campo | Valor |
|-------|-------|
| **ID** | TC-GROWTH-003 |
| **Prioridade** | Baixa |
| **Pré-condições** | Landing page com social proof ativo |

**Passos:**
1. Aguardar na landing page
2. Observar toasts de social proof

**Resultado Esperado:**
- [x] Toasts aparecem periodicamente
- [x] Mostram atividade recente de usuários
- [x] Desaparecem após alguns segundos

---

## 8. INTERNACIONALIZAÇÃO

### TC-I18N-001: Troca de Idioma
| Campo | Valor |
|-------|-------|
| **ID** | TC-I18N-001 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário em qualquer página |

**Passos:**
1. Localizar seletor de idioma
2. Trocar para Inglês (EN)
3. Verificar textos

**Resultado Esperado:**
- [x] Todos os textos mudam para inglês
- [x] Preferência é salva
- [x] Próximo acesso mantém idioma

---

### TC-I18N-002: Detecção Automática de Idioma
| Campo | Valor |
|-------|-------|
| **ID** | TC-I18N-002 |
| **Prioridade** | Baixa |
| **Pré-condições** | Navegador configurado em espanhol |

**Passos:**
1. Acessar site pela primeira vez
2. Verificar idioma inicial

**Resultado Esperado:**
- [x] Idioma detectado do navegador
- [x] Site exibe em espanhol (se suportado)

---

## 9. NOTIFICAÇÕES

### TC-NOTIF-001: Receber Notificação
| Campo | Valor |
|-------|-------|
| **ID** | TC-NOTIF-001 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Observar ícone de notificações no header
2. Clicar no ícone
3. Visualizar notificações

**Resultado Esperado:**
- [x] Badge mostra quantidade não lida
- [x] Lista de notificações abre
- [x] Notificações são exibidas corretamente

---

### TC-NOTIF-002: Marcar como Lida
| Campo | Valor |
|-------|-------|
| **ID** | TC-NOTIF-002 |
| **Prioridade** | Baixa |
| **Pré-condições** | Notificação não lida existente |

**Passos:**
1. Abrir notificações
2. Clicar em uma notificação
3. Observar mudança de estado

**Resultado Esperado:**
- [x] Notificação marcada como lida
- [x] Badge atualiza contador
- [x] Visual diferencia lida/não lida

---

## 10. PERFIL E CONFIGURAÇÕES

### TC-PROFILE-001: Editar Nome
| Campo | Valor |
|-------|-------|
| **ID** | TC-PROFILE-001 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Acessar Configurações/Perfil
2. Alterar nome
3. Salvar

**Resultado Esperado:**
- [x] Nome é atualizado
- [x] Aparece no header
- [x] Toast de sucesso

---

### TC-PROFILE-002: Upload de Avatar
| Campo | Valor |
|-------|-------|
| **ID** | TC-PROFILE-002 |
| **Prioridade** | Baixa |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Acessar Configurações
2. Clicar em foto de perfil
3. Fazer upload de nova imagem
4. Salvar

**Resultado Esperado:**
- [x] Imagem é carregada
- [x] Preview exibido
- [x] Avatar atualizado em todo o app

---

### TC-PROFILE-003: Configurar Identidade do Carrossel
| Campo | Valor |
|-------|-------|
| **ID** | TC-PROFILE-003 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Acessar Configurações
2. Configurar nome/username para carrosséis
3. Configurar posição do avatar
4. Salvar

**Resultado Esperado:**
- [x] Configurações salvas
- [x] Próximo carrossel usa estas configs
- [x] Preview mostra resultado

---

## 11. EDGE CASES E ERROS

### TC-EDGE-001: Arquivo de Áudio Inválido
| Campo | Valor |
|-------|-------|
| **ID** | TC-EDGE-001 |
| **Prioridade** | Alta |
| **Pré-condições** | Arquivo .txt renomeado para .mp3 |

**Passos:**
1. Tentar fazer upload do arquivo falso
2. Observar resultado

**Resultado Esperado:**
- [x] Erro é exibido
- [x] Arquivo é rejeitado
- [x] Mensagem clara de formato inválido

---

### TC-EDGE-002: Áudio Muito Grande
| Campo | Valor |
|-------|-------|
| **ID** | TC-EDGE-002 |
| **Prioridade** | Média |
| **Pré-condições** | Arquivo de áudio > 10MB |

**Passos:**
1. Tentar fazer upload
2. Observar resultado

**Resultado Esperado:**
- [x] Erro de tamanho exibido
- [x] Upload não prossegue
- [x] Limite de tamanho informado

---

### TC-EDGE-003: Sessão Expirada
| Campo | Valor |
|-------|-------|
| **ID** | TC-EDGE-003 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Deixar sessão expirar (ou limpar cookies)
2. Tentar realizar ação

**Resultado Esperado:**
- [x] Redirecionamento para login
- [x] Mensagem de sessão expirada
- [x] Dados não são perdidos (se aplicável)

---

### TC-EDGE-004: Conexão Perdida Durante Geração
| Campo | Valor |
|-------|-------|
| **ID** | TC-EDGE-004 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel em processamento |

**Passos:**
1. Iniciar geração de carrossel
2. Desconectar internet momentaneamente
3. Reconectar

**Resultado Esperado:**
- [x] Erro é exibido
- [x] Opção de tentar novamente
- [x] Carrossel pode ser recuperado ou recriado

---

### TC-EDGE-005: Múltiplas Abas
| Campo | Valor |
|-------|-------|
| **ID** | TC-EDGE-005 |
| **Prioridade** | Baixa |
| **Pré-condições** | Usuário logado |

**Passos:**
1. Abrir app em 2 abas
2. Fazer logout em uma aba
3. Tentar ação na outra aba

**Resultado Esperado:**
- [x] Segunda aba detecta logout
- [x] Redirecionamento para login
- [x] Sem erros críticos

---

## 12. RETENÇÃO DE IMAGENS

### TC-RET-001: Expiração de Imagens (30 dias)
| Campo | Valor |
|-------|-------|
| **ID** | TC-RET-001 |
| **Prioridade** | Média |
| **Pré-condições** | Carrossel com mais de 25 dias |

**Passos:**
1. Acessar carrossel antigo
2. Verificar indicador de expiração

**Resultado Esperado:**
- [x] Badge mostra dias restantes
- [x] Cor indica urgência (vermelho se <3 dias)
- [x] Possível baixar antes de expirar

---

---

# PARTE 2: TESTES DO PAINEL ADMIN

## Pré-requisitos Admin
- Conta com role "admin" atribuída
- Acesso ao painel em /admin

---

## 13. ACESSO AO ADMIN

### TC-ADMIN-001: Acesso ao Painel Admin
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-001 |
| **Prioridade** | Crítica |
| **Pré-condições** | Usuário com role admin |

**Passos:**
1. Fazer login com conta admin
2. Acessar /admin

**Resultado Esperado:**
- [x] Painel admin carrega
- [x] Menu lateral com todas as seções
- [x] Dashboard com estatísticas

---

### TC-ADMIN-002: Bloqueio para Não-Admin
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-002 |
| **Prioridade** | Crítica |
| **Pré-condições** | Usuário comum (não admin) |

**Passos:**
1. Fazer login com conta comum
2. Tentar acessar /admin diretamente

**Resultado Esperado:**
- [x] Acesso negado
- [x] Redirecionamento para Dashboard
- [x] Nenhum dado sensível exposto

---

## 14. GERENCIAMENTO DE USUÁRIOS

### TC-ADMIN-003: Listar Usuários
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-003 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar seção "Usuários"
2. Visualizar lista

**Resultado Esperado:**
- [x] Todos os usuários listados
- [x] Paginação funciona
- [x] Filtros funcionam (por plano, status)
- [x] Busca por email funciona

---

### TC-ADMIN-004: Atribuir Assinatura Manual
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-004 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuário comum existente |

**Passos:**
1. Localizar usuário
2. Clicar em "Assinatura Manual"
3. Selecionar plano Creator
4. Definir validade (ex: 30 dias)
5. Adicionar motivo
6. Salvar

**Resultado Esperado:**
- [x] Assinatura atribuída
- [x] Usuário passa a ter acesso Creator
- [x] Registro fica no histórico
- [x] Data de expiração correta

---

### TC-ADMIN-005: Revogar Assinatura Manual
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-005 |
| **Prioridade** | Média |
| **Pré-condições** | Usuário com assinatura manual |

**Passos:**
1. Localizar usuário
2. Revogar assinatura manual
3. Confirmar

**Resultado Esperado:**
- [x] Assinatura removida
- [x] Usuário volta ao plano anterior
- [x] Registro mantido no histórico

---

### TC-ADMIN-006: Atribuir Role Admin
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-006 |
| **Prioridade** | Crítica |
| **Pré-condições** | Usuário comum |

**Passos:**
1. Localizar usuário
2. Acessar "Gerenciar Roles"
3. Atribuir role "admin"
4. Salvar

**Resultado Esperado:**
- [x] Role atribuída
- [x] Usuário pode acessar /admin
- [x] Ação registrada em log

---

## 15. CUPONS DE DESCONTO

### TC-ADMIN-007: Criar Cupom de Desconto
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-007 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar seção "Cupons"
2. Clicar em "Novo Cupom"
3. Preencher código: "QA_TEST_50"
4. Tipo: Porcentagem
5. Valor: 50%
6. Limite de usos: 10
7. Data de expiração: +30 dias
8. Salvar

**Resultado Esperado:**
- [x] Cupom criado
- [x] Aparece na lista
- [x] Pode ser usado no checkout

---

### TC-ADMIN-008: Desativar Cupom
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-008 |
| **Prioridade** | Média |
| **Pré-condições** | Cupom ativo existente |

**Passos:**
1. Localizar cupom
2. Desativar

**Resultado Esperado:**
- [x] Cupom desativado
- [x] Não pode mais ser usado
- [x] Usos anteriores mantidos

---

### TC-ADMIN-009: Visualizar Uso de Cupons
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-009 |
| **Prioridade** | Baixa |
| **Pré-condições** | Cupons com usos |

**Passos:**
1. Acessar detalhes de um cupom
2. Ver histórico de usos

**Resultado Esperado:**
- [x] Lista de usuários que usaram
- [x] Data de cada uso
- [x] Contador atualizado

---

## 16. BROADCAST (NOTIFICAÇÕES E EMAILS EM MASSA)

### TC-ADMIN-010: Enviar Notificação para Todos
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-010 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Broadcast"
2. Aba "Notificações"
3. Marcar "Todos os usuários"
4. Preencher título (PT, EN, ES)
5. Preencher mensagem
6. Enviar

**Resultado Esperado:**
- [x] Confirmação solicitada
- [x] Job criado
- [x] Progresso exibido em tempo real
- [x] Notificações entregues aos usuários

---

### TC-ADMIN-011: Enviar Notificação por Plano
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-011 |
| **Prioridade** | Alta |
| **Pré-condições** | Usuários em diferentes planos |

**Passos:**
1. Acessar Broadcast
2. Selecionar apenas "Free"
3. Preencher conteúdo
4. Enviar

**Resultado Esperado:**
- [x] Apenas usuários Free recebem
- [x] Contador mostra total correto
- [x] Usuários de outros planos não recebem

---

### TC-ADMIN-012: Enviar Email em Massa
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-012 |
| **Prioridade** | Alta |
| **Pré-condições** | SMTP configurado |

**Passos:**
1. Acessar Broadcast > Email
2. Selecionar planos alvo
3. Preencher assunto e conteúdo
4. Enviar

**Resultado Esperado:**
- [x] Emails enviados em lotes
- [x] Progresso atualiza em tempo real
- [x] Falhas são registradas
- [x] Possível reprocessar falhas

---

### TC-ADMIN-013: Reprocessar Falhas de Broadcast
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-013 |
| **Prioridade** | Média |
| **Pré-condições** | Broadcast com falhas |

**Passos:**
1. Acessar histórico de broadcasts
2. Localizar job com falhas
3. Clicar em "Ver falhas"
4. Clicar em "Reprocessar"

**Resultado Esperado:**
- [x] Falhas são listadas
- [x] Reprocessamento inicia
- [x] Sucesso/falha atualizado

---

## 17. CONTEÚDO DA LANDING PAGE

### TC-ADMIN-014: Editar FAQs
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-014 |
| **Prioridade** | Média |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Landing Page" > FAQs
2. Adicionar nova pergunta (PT)
3. Clicar em "Traduzir automaticamente"
4. Salvar

**Resultado Esperado:**
- [x] FAQ adicionada
- [x] Tradução automática funciona
- [x] Aparece na landing page
- [x] Ordem pode ser alterada

---

### TC-ADMIN-015: Gerenciar Depoimentos
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-015 |
| **Prioridade** | Média |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Depoimentos"
2. Adicionar novo depoimento
3. Preencher dados e avatar
4. Salvar

**Resultado Esperado:**
- [x] Depoimento adicionado
- [x] Aparece na landing page
- [x] Avatar exibido corretamente

---

### TC-ADMIN-016: Empresas Parceiras
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-016 |
| **Prioridade** | Baixa |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Empresas Parceiras"
2. Adicionar empresa com logo SVG
3. Salvar

**Resultado Esperado:**
- [x] Logo SVG aceito
- [x] Aparece na seção "Trusted By"
- [x] Ordem configurável

---

## 18. CONFIGURAÇÕES DO SISTEMA

### TC-ADMIN-017: Modo Manutenção
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-017 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Sistema"
2. Ativar modo manutenção
3. Definir mensagem
4. Salvar
5. Acessar site em aba anônima

**Resultado Esperado:**
- [x] Site exibe página de manutenção
- [x] Admin ainda consegue acessar
- [x] Mensagem customizada exibida

---

### TC-ADMIN-018: Configurações de Email
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-018 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Email" > Configurações
2. Verificar/atualizar configurações SMTP
3. Enviar email de teste

**Resultado Esperado:**
- [x] Configurações salvas
- [x] Email de teste enviado
- [x] Email recebido corretamente

---

### TC-ADMIN-019: Templates de Email
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-019 |
| **Prioridade** | Média |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Templates de Email"
2. Editar template "Verificação de Email"
3. Modificar HTML
4. Salvar
5. Testar com cadastro novo

**Resultado Esperado:**
- [x] Template editável
- [x] Preview funciona
- [x] Mudanças refletem nos emails enviados

---

## 19. ANALYTICS E RELATÓRIOS

### TC-ADMIN-020: Dashboard de Analytics
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-020 |
| **Prioridade** | Média |
| **Pré-condições** | Dados existentes no sistema |

**Passos:**
1. Acessar "Analytics"
2. Verificar métricas exibidas

**Resultado Esperado:**
- [x] Total de usuários exibido
- [x] Usuários por plano
- [x] Carrosséis gerados
- [x] Gráficos funcionam

---

### TC-ADMIN-021: Eventos do Stripe
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-021 |
| **Prioridade** | Média |
| **Pré-condições** | Eventos de pagamento existentes |

**Passos:**
1. Acessar "Stripe Events"
2. Visualizar lista de eventos

**Resultado Esperado:**
- [x] Eventos listados
- [x] Filtro por tipo funciona
- [x] Detalhes do evento acessíveis

---

### TC-ADMIN-022: Logs de Uso
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-022 |
| **Prioridade** | Baixa |
| **Pré-condições** | Atividade no sistema |

**Passos:**
1. Acessar "Logs de Uso"
2. Filtrar por usuário ou ação

**Resultado Esperado:**
- [x] Logs detalhados
- [x] Filtros funcionam
- [x] Possível exportar

---

## 20. CONFIGURAÇÕES DE PLANOS

### TC-ADMIN-023: Editar Preços de Planos
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-023 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Planos"
2. Editar plano Starter
3. Alterar preço BRL
4. Salvar

**Resultado Esperado:**
- [x] Preço atualizado
- [x] Landing page reflete mudança
- [x] Checkout usa novo preço

**ATENÇÃO:** Mudança de preço no app NÃO muda no Stripe automaticamente - precisa atualizar no Stripe também.

---

### TC-ADMIN-024: Editar Limites de Planos
| Campo | Valor |
|-------|-------|
| **ID** | TC-ADMIN-024 |
| **Prioridade** | Alta |
| **Pré-condições** | Admin logado |

**Passos:**
1. Acessar "Planos"
2. Editar limite diário do Creator
3. Salvar

**Resultado Esperado:**
- [x] Limite atualizado
- [x] Usuários Creator afetados imediatamente

---

---

# CHECKLIST FINAL

## Antes de Aprovar para Produção

- [ ] Todos os testes críticos passaram
- [ ] Todos os testes de alta prioridade passaram
- [ ] Bugs encontrados foram documentados
- [ ] Fluxo de pagamento testado end-to-end
- [ ] Emails chegando corretamente em todos os idiomas
- [ ] Mobile testado (iOS Safari, Android Chrome)
- [ ] Performance aceitável (<3s para carregar)

---

## Bugs Encontrados

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| | | | |

---

## Observações do QA

```
Espaço para anotações durante os testes
```

---

**Documento gerado em:** Janeiro 2026
**Autor:** Sistema Audisell
**Versão:** 1.0
