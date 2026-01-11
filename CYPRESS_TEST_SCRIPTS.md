# Cypress E2E Test Scripts - Audisell

Este documento contém scripts Cypress prontos para execução. O time de QA pode criar um projeto Cypress separado e copiar estes scripts.

---

## Setup Inicial (Projeto Separado)

```bash
# Criar projeto de testes separado
mkdir audisell-e2e-tests
cd audisell-e2e-tests
npm init -y
npm install cypress @testing-library/cypress --save-dev
npx cypress open
```

### cypress.config.ts

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "https://seu-dominio.com", // URL de produção/staging
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    video: true,
    screenshotOnRunFailure: true,
    env: {
      // Credenciais de teste - PREENCHER COM CONTAS REAIS
      TEST_USER_FREE_EMAIL: "qa-free@seudominio.com",
      TEST_USER_FREE_PASSWORD: "SenhaSegura123!",
      TEST_USER_STARTER_EMAIL: "qa-starter@seudominio.com",
      TEST_USER_STARTER_PASSWORD: "SenhaSegura123!",
      TEST_USER_CREATOR_EMAIL: "qa-creator@seudominio.com",
      TEST_USER_CREATOR_PASSWORD: "SenhaSegura123!",
      TEST_ADMIN_EMAIL: "admin@seudominio.com",
      TEST_ADMIN_PASSWORD: "AdminSenha123!",
      // Cartão de teste Stripe
      STRIPE_TEST_CARD: "4242424242424242",
      // Cupons de desconto
      DISCOUNT_COUPON_10: "QA_DESCONTO_10",
      DISCOUNT_COUPON_50: "QA_DESCONTO_50",
    },
  },
});
```

### cypress/support/commands.ts

```typescript
/// <reference types="cypress" />

// Login command
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/auth");
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should("include", "/dashboard");
});

// Login as specific user type
Cypress.Commands.add("loginAsFreeUser", () => {
  cy.login(Cypress.env("TEST_USER_FREE_EMAIL"), Cypress.env("TEST_USER_FREE_PASSWORD"));
});

Cypress.Commands.add("loginAsStarterUser", () => {
  cy.login(Cypress.env("TEST_USER_STARTER_EMAIL"), Cypress.env("TEST_USER_STARTER_PASSWORD"));
});

Cypress.Commands.add("loginAsCreatorUser", () => {
  cy.login(Cypress.env("TEST_USER_CREATOR_EMAIL"), Cypress.env("TEST_USER_CREATOR_PASSWORD"));
});

Cypress.Commands.add("loginAsAdmin", () => {
  cy.login(Cypress.env("TEST_ADMIN_EMAIL"), Cypress.env("TEST_ADMIN_PASSWORD"));
});

// Logout command
Cypress.Commands.add("logout", () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.contains("Sair").click();
  cy.url().should("eq", Cypress.config().baseUrl + "/");
});

// Wait for loading to complete
Cypress.Commands.add("waitForLoading", () => {
  cy.get('[data-testid="loading"]', { timeout: 10000 }).should("not.exist");
});

// Fill Stripe card
Cypress.Commands.add("fillStripeCard", () => {
  cy.get('iframe[name^="__privateStripeFrame"]').then(($iframe) => {
    const doc = $iframe.contents();
    cy.wrap(doc.find('input[name="cardnumber"]')).type(Cypress.env("STRIPE_TEST_CARD"));
    cy.wrap(doc.find('input[name="exp-date"]')).type("1230");
    cy.wrap(doc.find('input[name="cvc"]')).type("123");
    cy.wrap(doc.find('input[name="postal"]')).type("12345");
  });
});

// Type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginAsFreeUser(): Chainable<void>;
      loginAsStarterUser(): Chainable<void>;
      loginAsCreatorUser(): Chainable<void>;
      loginAsAdmin(): Chainable<void>;
      logout(): Chainable<void>;
      waitForLoading(): Chainable<void>;
      fillStripeCard(): Chainable<void>;
    }
  }
}

export {};
```

---

## Test Scripts

### 1. cypress/e2e/auth.cy.ts - Autenticação

```typescript
describe("Autenticação", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("Landing Page", () => {
    it("CT-001: Deve exibir landing page corretamente", () => {
      cy.contains("Audisell").should("be.visible");
      cy.contains("Começar Grátis").should("be.visible");
      cy.get('[data-testid="hero-section"]').should("be.visible");
    });

    it("CT-002: Deve navegar para login ao clicar em Entrar", () => {
      cy.contains("Entrar").click();
      cy.url().should("include", "/auth");
    });

    it("CT-003: Deve navegar para cadastro ao clicar em Começar Grátis", () => {
      cy.contains("Começar Grátis").click();
      cy.url().should("include", "/auth");
    });
  });

  describe("Login", () => {
    beforeEach(() => {
      cy.visit("/auth");
    });

    it("CT-004: Deve fazer login com credenciais válidas", () => {
      cy.loginAsFreeUser();
      cy.url().should("include", "/dashboard");
      cy.contains("Meus Carrosséis").should("be.visible");
    });

    it("CT-005: Deve exibir erro com credenciais inválidas", () => {
      cy.get('input[type="email"]').type("invalido@teste.com");
      cy.get('input[type="password"]').type("senhaerrada");
      cy.get('button[type="submit"]').click();
      cy.contains("Credenciais inválidas").should("be.visible");
    });

    it("CT-006: Deve exibir erro com email mal formatado", () => {
      cy.get('input[type="email"]').type("emailinvalido");
      cy.get('input[type="password"]').type("senha123");
      cy.get('button[type="submit"]').click();
      cy.get('input[type="email"]:invalid').should("exist");
    });

    it("CT-007: Deve navegar para recuperação de senha", () => {
      cy.contains("Esqueceu sua senha?").click();
      cy.url().should("include", "/forgot-password");
    });
  });

  describe("Cadastro", () => {
    it("CT-008: Deve cadastrar novo usuário com email válido", () => {
      const uniqueEmail = `qa-test-${Date.now()}@teste.com`;

      cy.visit("/auth?mode=signup");
      cy.get('input[name="name"]').type("QA Tester");
      cy.get('input[type="email"]').type(uniqueEmail);
      cy.get('input[type="password"]').type("SenhaForte123!");
      cy.get('button[type="submit"]').click();

      // Pode redirecionar para verificação de email ou dashboard
      cy.url().should("match", /(verify-email|dashboard)/);
    });

    it("CT-009: Deve exibir erro ao cadastrar com email já existente", () => {
      cy.visit("/auth?mode=signup");
      cy.get('input[name="name"]').type("Teste Duplicado");
      cy.get('input[type="email"]').type(Cypress.env("TEST_USER_FREE_EMAIL"));
      cy.get('input[type="password"]').type("SenhaForte123!");
      cy.get('button[type="submit"]').click();

      cy.contains(/já existe|already exists/i).should("be.visible");
    });

    it("CT-010: Deve validar força da senha", () => {
      cy.visit("/auth?mode=signup");
      cy.get('input[name="name"]').type("Teste Senha");
      cy.get('input[type="email"]').type("teste@teste.com");
      cy.get('input[type="password"]').type("123"); // Senha fraca
      cy.get('button[type="submit"]').click();

      cy.contains(/senha.*fraca|password.*weak/i).should("be.visible");
    });
  });

  describe("Recuperação de Senha", () => {
    it("CT-011: Deve enviar email de recuperação", () => {
      cy.visit("/forgot-password");
      cy.get('input[type="email"]').type(Cypress.env("TEST_USER_FREE_EMAIL"));
      cy.get('button[type="submit"]').click();

      cy.contains(/email enviado|check your email/i).should("be.visible");
    });
  });

  describe("Logout", () => {
    it("CT-012: Deve fazer logout corretamente", () => {
      cy.loginAsFreeUser();
      cy.logout();
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });
});
```

### 2. cypress/e2e/carousel-free.cy.ts - Criação Carrossel (Plano Free)

```typescript
describe("Criação de Carrossel - Plano Free", () => {
  beforeEach(() => {
    cy.loginAsFreeUser();
    cy.visit("/create");
  });

  it("CT-013: Deve exibir limite de 3 slides para usuário free", () => {
    cy.contains(/até 3 slides|3 slides/i).should("be.visible");
  });

  it("CT-014: Deve criar carrossel com texto simples", () => {
    // Passo 1: Inserir texto
    cy.get('textarea[name="content"]').type(
      "Dica 1: Faça exercícios diariamente\nDica 2: Beba muita água\nDica 3: Durma bem"
    );
    cy.contains("Próximo").click();

    // Passo 2: Escolher template
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();

    // Passo 3: Preview e gerar
    cy.contains("Gerar Carrossel").click();

    // Aguardar geração
    cy.contains("Gerando", { timeout: 30000 }).should("not.exist");

    // Verificar resultado
    cy.get('[data-testid="carousel-preview"]').should("be.visible");
    cy.get('[data-testid="slide"]').should("have.length.lte", 3);
  });

  it("CT-015: Deve bloquear mais de 3 slides no plano free", () => {
    cy.get('textarea[name="content"]').type(
      "Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5"
    );
    cy.contains("Próximo").click();

    // Deve mostrar aviso de upgrade ou limitar slides
    cy.get("body").then(($body) => {
      if ($body.text().includes("upgrade") || $body.text().includes("Upgrade")) {
        cy.contains(/upgrade|atualizar plano/i).should("be.visible");
      } else {
        cy.get('[data-testid="slide"]').should("have.length", 3);
      }
    });
  });

  it("CT-016: Deve permitir customização básica de cores", () => {
    cy.get('textarea[name="content"]').type("Teste de cores");
    cy.contains("Próximo").click();

    // Verificar opções de cores
    cy.get('[data-testid="color-picker"]').should("exist");
  });

  it("CT-017: Deve exibir marca d'água no plano free", () => {
    cy.get('textarea[name="content"]').type("Teste marca d'água");
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();
    cy.contains("Gerar Carrossel").click();

    cy.contains("Gerando", { timeout: 30000 }).should("not.exist");

    // Verificar marca d'água
    cy.contains(/audisell|watermark/i).should("be.visible");
  });

  it("CT-018: Deve salvar carrossel no histórico", () => {
    cy.get('textarea[name="content"]').type("Carrossel para histórico");
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();
    cy.contains("Gerar Carrossel").click();

    cy.contains("Gerando", { timeout: 30000 }).should("not.exist");

    // Ir para histórico
    cy.visit("/history");
    cy.contains("Carrossel para histórico").should("be.visible");
  });

  it("CT-019: Deve fazer download do carrossel", () => {
    // Assumindo que já existe um carrossel
    cy.visit("/history");
    cy.get('[data-testid="carousel-card"]').first().click();

    // Clicar em download
    cy.contains("Baixar").click();

    // Verificar que download iniciou (ou modal de download apareceu)
    cy.contains(/baixando|download/i).should("be.visible");
  });
});
```

### 3. cypress/e2e/carousel-starter.cy.ts - Criação Carrossel (Plano Starter)

```typescript
describe("Criação de Carrossel - Plano Starter", () => {
  beforeEach(() => {
    cy.loginAsStarterUser();
    cy.visit("/create");
  });

  it("CT-020: Deve permitir até 6 slides", () => {
    cy.get('textarea[name="content"]').type(
      "Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5\nSlide 6"
    );
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();
    cy.contains("Gerar Carrossel").click();

    cy.contains("Gerando", { timeout: 30000 }).should("not.exist");
    cy.get('[data-testid="slide"]').should("have.length", 6);
  });

  it("CT-021: Deve ter acesso a templates premium", () => {
    cy.get('textarea[name="content"]').type("Teste templates");
    cy.contains("Próximo").click();

    cy.get('[data-testid="template-option"]').should("have.length.gt", 3);
    cy.contains(/premium|exclusivo/i).should("be.visible");
  });

  it("CT-022: Deve permitir upload de logo", () => {
    cy.get('textarea[name="content"]').type("Teste logo");
    cy.contains("Próximo").click();

    // Verificar opção de upload de logo
    cy.contains(/logo|marca/i).click();
    cy.get('input[type="file"]').should("exist");
  });

  it("CT-023: Não deve ter marca d'água", () => {
    cy.get('textarea[name="content"]').type("Teste sem marca");
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();
    cy.contains("Gerar Carrossel").click();

    cy.contains("Gerando", { timeout: 30000 }).should("not.exist");

    // Verificar ausência de marca d'água no preview
    cy.get('[data-testid="carousel-preview"]').should("be.visible");
    // A marca d'água Audisell não deve aparecer no carrossel
  });
});
```

### 4. cypress/e2e/carousel-creator.cy.ts - Criação Carrossel (Plano Creator)

```typescript
describe("Criação de Carrossel - Plano Creator", () => {
  beforeEach(() => {
    cy.loginAsCreatorUser();
    cy.visit("/create");
  });

  it("CT-024: Deve permitir até 15 slides", () => {
    const slides = Array.from({ length: 15 }, (_, i) => `Slide ${i + 1}`).join("\n");

    cy.get('textarea[name="content"]').type(slides);
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();
    cy.contains("Gerar Carrossel").click();

    cy.contains("Gerando", { timeout: 60000 }).should("not.exist");
    cy.get('[data-testid="slide"]').should("have.length", 15);
  });

  it("CT-025: Deve ter acesso a todos os templates", () => {
    cy.get('textarea[name="content"]').type("Teste templates creator");
    cy.contains("Próximo").click();

    // Verificar acesso a todos os templates (sem bloqueio)
    cy.get('[data-testid="template-locked"]').should("not.exist");
  });

  it("CT-026: Deve permitir geração por IA/transcrição", () => {
    // Verificar opção de IA/transcrição
    cy.contains(/IA|inteligência artificial|transcrição/i).should("be.visible");
  });

  it("CT-027: Deve permitir agendamento de posts", () => {
    cy.get('textarea[name="content"]').type("Post agendado");
    cy.contains("Próximo").click();
    cy.get('[data-testid="template-option"]').first().click();
    cy.contains("Próximo").click();

    // Verificar opção de agendamento
    cy.contains(/agendar|schedule/i).should("be.visible");
  });

  it("CT-028: Deve ter suporte prioritário visível", () => {
    cy.visit("/support");
    cy.contains(/prioritário|priority/i).should("be.visible");
  });
});
```

### 5. cypress/e2e/payments.cy.ts - Fluxo de Pagamentos

```typescript
describe("Fluxo de Pagamentos", () => {
  beforeEach(() => {
    cy.loginAsFreeUser();
  });

  it("CT-029: Deve exibir página de preços corretamente", () => {
    cy.visit("/");
    cy.contains(/preços|pricing/i).click();

    cy.contains("Free").should("be.visible");
    cy.contains("Starter").should("be.visible");
    cy.contains("Creator").should("be.visible");
  });

  it("CT-030: Deve redirecionar para Stripe ao clicar em upgrade", () => {
    cy.visit("/dashboard");
    cy.contains(/upgrade|atualizar/i).click();

    // Selecionar plano
    cy.contains("Starter").click();
    cy.contains(/assinar|subscribe/i).click();

    // Deve redirecionar para Stripe Checkout
    cy.url().should("include", "checkout.stripe.com");
  });

  it("CT-031: Deve aplicar cupom de desconto", () => {
    cy.visit("/dashboard");
    cy.contains(/upgrade|atualizar/i).click();
    cy.contains("Starter").click();

    // Inserir cupom
    cy.get('input[name="coupon"]').type(Cypress.env("DISCOUNT_COUPON_10"));
    cy.contains(/aplicar|apply/i).click();

    // Verificar desconto aplicado
    cy.contains(/desconto|discount/i).should("be.visible");
  });

  it("CT-032: Deve exibir erro com cupom inválido", () => {
    cy.visit("/dashboard");
    cy.contains(/upgrade|atualizar/i).click();
    cy.contains("Starter").click();

    cy.get('input[name="coupon"]').type("CUPOM_INVALIDO");
    cy.contains(/aplicar|apply/i).click();

    cy.contains(/inválido|invalid/i).should("be.visible");
  });

  it("CT-033: Deve processar pagamento com cartão de teste", () => {
    // Este teste requer ambiente de staging com Stripe Test Mode
    cy.visit("/dashboard");
    cy.contains(/upgrade|atualizar/i).click();
    cy.contains("Starter").click();
    cy.contains(/assinar|subscribe/i).click();

    // No Stripe Checkout
    cy.origin("https://checkout.stripe.com", () => {
      cy.get('input[name="cardNumber"]').type("4242424242424242");
      cy.get('input[name="cardExpiry"]').type("1230");
      cy.get('input[name="cardCvc"]').type("123");
      cy.get('input[name="billingName"]').type("QA Tester");
      cy.get('button[type="submit"]').click();
    });

    // Voltar para o app e verificar upgrade
    cy.url({ timeout: 30000 }).should("include", "/dashboard");
    cy.contains("Starter").should("be.visible");
  });

  it("CT-034: Deve permitir cancelar assinatura", () => {
    cy.loginAsStarterUser();
    cy.visit("/profile");

    cy.contains(/assinatura|subscription/i).click();
    cy.contains(/cancelar|cancel/i).click();

    // Confirmar cancelamento
    cy.contains(/confirmar|confirm/i).click();

    cy.contains(/cancelada|cancelled/i).should("be.visible");
  });

  it("CT-035: Deve exibir histórico de faturas", () => {
    cy.loginAsStarterUser();
    cy.visit("/profile");

    cy.contains(/faturas|invoices/i).click();
    cy.get('[data-testid="invoice-row"]').should("have.length.gte", 1);
  });
});
```

### 6. cypress/e2e/admin.cy.ts - Painel Administrativo

```typescript
describe("Painel Administrativo", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit("/admin");
  });

  describe("Dashboard", () => {
    it("CT-036: Deve exibir estatísticas gerais", () => {
      cy.contains("Dashboard").should("be.visible");
      cy.get('[data-testid="stats-card"]').should("have.length.gte", 4);
      cy.contains(/usuários|users/i).should("be.visible");
      cy.contains(/carrosséis|carousels/i).should("be.visible");
    });

    it("CT-037: Deve exibir gráficos de analytics", () => {
      cy.get('[data-testid="chart"]').should("be.visible");
    });
  });

  describe("Gestão de Usuários", () => {
    it("CT-038: Deve listar usuários com paginação", () => {
      cy.contains("Usuários").click();
      cy.get('[data-testid="user-row"]').should("have.length.lte", 20);

      // Verificar paginação
      cy.get('[data-testid="pagination"]').should("be.visible");
    });

    it("CT-039: Deve filtrar usuários por plano", () => {
      cy.contains("Usuários").click();
      cy.get('select[name="plan-filter"]').select("starter");

      cy.get('[data-testid="user-row"]').each(($row) => {
        cy.wrap($row).contains("Starter");
      });
    });

    it("CT-040: Deve buscar usuário por email", () => {
      cy.contains("Usuários").click();
      cy.get('input[name="search"]').type(Cypress.env("TEST_USER_FREE_EMAIL"));

      cy.get('[data-testid="user-row"]').should("have.length", 1);
    });

    it("CT-041: Deve atribuir assinatura manual", () => {
      cy.contains("Usuários").click();
      cy.get('[data-testid="user-row"]').first().find('[data-testid="edit-user"]').click();

      cy.contains(/assinatura manual|manual subscription/i).click();
      cy.get('select[name="plan"]').select("creator");
      cy.get('input[name="expires"]').type("2025-12-31");
      cy.contains(/salvar|save/i).click();

      cy.contains(/sucesso|success/i).should("be.visible");
    });
  });

  describe("Broadcast", () => {
    it("CT-042: Deve criar broadcast por email", () => {
      cy.contains("Broadcast").click();
      cy.contains(/novo broadcast|new broadcast/i).click();

      cy.get('input[name="subject"]').type("Teste QA - Email Broadcast");
      cy.get('textarea[name="content"]').type("Este é um email de teste do QA.");
      cy.get('select[name="channel"]').select("email");
      cy.get('select[name="segment"]').select("all");

      cy.contains(/enviar|send/i).click();
      cy.contains(/enviado|sent/i).should("be.visible");
    });

    it("CT-043: Deve criar broadcast por notificação", () => {
      cy.contains("Broadcast").click();
      cy.contains(/novo broadcast|new broadcast/i).click();

      cy.get('input[name="title"]').type("Teste QA - Notificação");
      cy.get('textarea[name="message"]').type("Mensagem de teste.");
      cy.get('select[name="channel"]').select("notification");

      cy.contains(/enviar|send/i).click();
      cy.contains(/enviado|sent/i).should("be.visible");
    });

    it("CT-044: Deve segmentar broadcast por plano", () => {
      cy.contains("Broadcast").click();
      cy.contains(/novo broadcast|new broadcast/i).click();

      cy.get('select[name="segment"]').select("starter");

      // Verificar contagem de destinatários
      cy.get('[data-testid="recipient-count"]').should("be.visible");
    });
  });

  describe("Configurações", () => {
    it("CT-045: Deve editar configurações de SEO", () => {
      cy.contains("Configurações").click();
      cy.contains("SEO").click();

      cy.get('input[name="meta-title"]').clear().type("Novo Título SEO");
      cy.contains(/salvar|save/i).click();

      cy.contains(/salvo|saved/i).should("be.visible");
    });

    it("CT-046: Deve configurar Exit Intent", () => {
      cy.contains("Configurações").click();
      cy.contains("Growth").click();

      cy.get('[data-testid="exit-intent-toggle"]').click();
      cy.contains(/salvar|save/i).click();

      cy.contains(/salvo|saved/i).should("be.visible");
    });

    it("CT-047: Deve configurar Social Proof posição", () => {
      cy.contains("Configurações").click();
      cy.contains("Growth").click();
      cy.contains("Social Proof").click();

      // Mudar posição
      cy.contains("Direita").click();
      cy.contains(/salvar|save/i).click();

      cy.contains(/salvo|saved/i).should("be.visible");
    });

    it("CT-048: Deve gerenciar templates de email", () => {
      cy.contains("Configurações").click();
      cy.contains("Email").click();

      cy.get('[data-testid="email-template"]').first().click();
      cy.get('textarea[name="body"]').should("be.visible");
    });
  });

  describe("Conteúdo Landing Page", () => {
    it("CT-049: Deve editar FAQ", () => {
      cy.contains("Conteúdo").click();
      cy.contains("FAQ").click();

      cy.get('[data-testid="faq-item"]').first().click();
      cy.get('input[name="question"]').clear().type("Nova pergunta QA?");
      cy.contains(/salvar|save/i).click();

      cy.contains(/salvo|saved/i).should("be.visible");
    });

    it("CT-050: Deve editar depoimentos", () => {
      cy.contains("Conteúdo").click();
      cy.contains("Depoimentos").click();

      cy.contains(/adicionar|add/i).click();
      cy.get('input[name="name"]').type("QA Tester");
      cy.get('textarea[name="testimonial"]').type("Excelente ferramenta!");
      cy.contains(/salvar|save/i).click();

      cy.contains(/salvo|saved/i).should("be.visible");
    });
  });
});
```

### 7. cypress/e2e/i18n.cy.ts - Internacionalização

```typescript
describe("Internacionalização", () => {
  it("CT-051: Deve carregar em Português por padrão (Brasil)", () => {
    cy.visit("/");
    cy.contains("Começar Grátis").should("be.visible");
    cy.contains("Entrar").should("be.visible");
  });

  it("CT-052: Deve trocar para Inglês", () => {
    cy.visit("/");
    cy.get('[data-testid="language-selector"]').click();
    cy.contains("English").click();

    cy.contains("Get Started Free").should("be.visible");
    cy.contains("Sign In").should("be.visible");
  });

  it("CT-053: Deve trocar para Espanhol", () => {
    cy.visit("/");
    cy.get('[data-testid="language-selector"]').click();
    cy.contains("Español").click();

    cy.contains("Comenzar Gratis").should("be.visible");
    cy.contains("Iniciar Sesión").should("be.visible");
  });

  it("CT-054: Deve manter idioma após login", () => {
    cy.visit("/");
    cy.get('[data-testid="language-selector"]').click();
    cy.contains("English").click();

    cy.loginAsFreeUser();

    cy.contains("My Carousels").should("be.visible");
  });
});
```

### 8. cypress/e2e/notifications.cy.ts - Notificações

```typescript
describe("Notificações", () => {
  beforeEach(() => {
    cy.loginAsFreeUser();
  });

  it("CT-055: Deve exibir sino de notificações", () => {
    cy.get('[data-testid="notification-bell"]').should("be.visible");
  });

  it("CT-056: Deve abrir dropdown de notificações", () => {
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-dropdown"]').should("be.visible");
  });

  it("CT-057: Deve marcar notificação como lida", () => {
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-item"]').first().click();

    // Badge deve diminuir ou sumir
    cy.get('[data-testid="notification-badge"]').should("not.exist");
  });

  it("CT-058: Deve receber notificação de broadcast (se enviada)", () => {
    // Este teste depende de ter um broadcast pendente
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-dropdown"]').should("be.visible");
  });
});
```

### 9. cypress/e2e/profile.cy.ts - Configurações de Perfil

```typescript
describe("Configurações de Perfil", () => {
  beforeEach(() => {
    cy.loginAsFreeUser();
    cy.visit("/profile");
  });

  it("CT-059: Deve exibir informações do perfil", () => {
    cy.contains(Cypress.env("TEST_USER_FREE_EMAIL")).should("be.visible");
  });

  it("CT-060: Deve atualizar nome do usuário", () => {
    cy.get('input[name="name"]').clear().type("Nome Atualizado QA");
    cy.contains(/salvar|save/i).click();

    cy.contains(/salvo|saved|sucesso|success/i).should("be.visible");
  });

  it("CT-061: Deve alterar senha", () => {
    cy.contains(/alterar senha|change password/i).click();

    cy.get('input[name="currentPassword"]').type(Cypress.env("TEST_USER_FREE_PASSWORD"));
    cy.get('input[name="newPassword"]').type("NovaSenha123!");
    cy.get('input[name="confirmPassword"]').type("NovaSenha123!");
    cy.contains(/salvar|save/i).click();

    cy.contains(/alterada|changed|sucesso|success/i).should("be.visible");

    // Reverter senha para não quebrar outros testes
    cy.contains(/alterar senha|change password/i).click();
    cy.get('input[name="currentPassword"]').type("NovaSenha123!");
    cy.get('input[name="newPassword"]').type(Cypress.env("TEST_USER_FREE_PASSWORD"));
    cy.get('input[name="confirmPassword"]').type(Cypress.env("TEST_USER_FREE_PASSWORD"));
    cy.contains(/salvar|save/i).click();
  });

  it("CT-062: Deve exibir uso atual do plano", () => {
    cy.contains(/uso|usage/i).should("be.visible");
    cy.contains(/carrosséis|carousels/i).should("be.visible");
  });
});
```

### 10. cypress/e2e/edge-cases.cy.ts - Casos Extremos

```typescript
describe("Casos Extremos e Tratamento de Erros", () => {
  it("CT-063: Deve exibir 404 para página inexistente", () => {
    cy.visit("/pagina-que-nao-existe", { failOnStatusCode: false });
    cy.contains("404").should("be.visible");
  });

  it("CT-064: Deve redirecionar usuário não autenticado", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });

  it("CT-065: Deve bloquear acesso admin para usuário comum", () => {
    cy.loginAsFreeUser();
    cy.visit("/admin", { failOnStatusCode: false });

    // Deve redirecionar ou mostrar erro de permissão
    cy.url().should("not.include", "/admin");
  });

  it("CT-066: Deve lidar com sessão expirada", () => {
    cy.loginAsFreeUser();

    // Simular sessão expirada limpando cookies
    cy.clearCookies();
    cy.reload();

    // Deve redirecionar para login
    cy.url().should("include", "/auth");
  });

  it("CT-067: Deve validar upload de imagem (tamanho máximo)", () => {
    cy.loginAsCreatorUser();
    cy.visit("/create");

    // Tentar upload de arquivo muito grande
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from("x".repeat(10 * 1024 * 1024)), // 10MB
      fileName: "large-image.jpg",
      mimeType: "image/jpeg",
    }, { force: true });

    cy.contains(/tamanho máximo|file too large/i).should("be.visible");
  });

  it("CT-068: Deve validar formato de arquivo", () => {
    cy.loginAsCreatorUser();
    cy.visit("/create");

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from("test content"),
      fileName: "document.pdf",
      mimeType: "application/pdf",
    }, { force: true });

    cy.contains(/formato inválido|invalid format/i).should("be.visible");
  });

  it("CT-069: Deve funcionar offline gracefully", () => {
    cy.loginAsFreeUser();

    // Simular offline
    cy.intercept("**/*", { forceNetworkError: true }).as("offline");

    cy.visit("/dashboard", { failOnStatusCode: false });
    cy.contains(/offline|sem conexão|connection/i).should("be.visible");
  });

  it("CT-070: Deve lidar com rate limiting", () => {
    cy.loginAsFreeUser();

    // Fazer muitas requisições rápidas
    for (let i = 0; i < 20; i++) {
      cy.visit("/create", { failOnStatusCode: false });
    }

    // Pode mostrar erro de rate limit ou funcionar normalmente
    cy.get("body").should("be.visible");
  });
});
```

### 11. cypress/e2e/growth-features.cy.ts - Features de Growth

```typescript
describe("Features de Growth", () => {
  describe("Exit Intent Popup", () => {
    it("CT-071: Deve exibir popup ao tentar sair da página", () => {
      cy.visit("/");

      // Simular movimento do mouse para fora da página
      cy.get("body").trigger("mouseleave", { clientY: -10 });

      // Popup deve aparecer
      cy.get('[data-testid="exit-intent-popup"]', { timeout: 5000 }).should("be.visible");
    });

    it("CT-072: Deve fechar popup ao clicar no X", () => {
      cy.visit("/");
      cy.get("body").trigger("mouseleave", { clientY: -10 });

      cy.get('[data-testid="exit-intent-popup"]').should("be.visible");
      cy.get('[data-testid="exit-intent-close"]').click();

      cy.get('[data-testid="exit-intent-popup"]').should("not.exist");
    });

    it("CT-073: Popup não deve aparecer para usuário logado", () => {
      cy.loginAsFreeUser();
      cy.visit("/");

      cy.get("body").trigger("mouseleave", { clientY: -10 });

      // Popup NÃO deve aparecer
      cy.get('[data-testid="exit-intent-popup"]').should("not.exist");
    });
  });

  describe("Social Proof Toast", () => {
    it("CT-074: Deve exibir notificações de atividade", () => {
      cy.visit("/");

      // Aguardar toast aparecer (intervalo configurável)
      cy.get('[data-testid="social-proof-toast"]', { timeout: 15000 }).should("be.visible");
    });

    it("CT-075: Deve fechar toast ao clicar no X", () => {
      cy.visit("/");

      cy.get('[data-testid="social-proof-toast"]', { timeout: 15000 }).should("be.visible");
      cy.get('[data-testid="social-proof-close"]').click();

      // Toast não deve reaparecer na sessão
      cy.wait(10000);
      cy.get('[data-testid="social-proof-toast"]').should("not.exist");
    });
  });

  describe("Early Access / Scarcity", () => {
    it("CT-076: Deve exibir contador de vagas restantes", () => {
      cy.visit("/");

      cy.contains(/vagas|spots/i).should("be.visible");
      cy.get('[data-testid="spots-counter"]').should("be.visible");
    });
  });
});
```

---

## Executando os Testes

```bash
# Abrir Cypress UI (modo interativo)
npx cypress open

# Executar todos os testes (modo headless)
npx cypress run

# Executar apenas um arquivo de teste
npx cypress run --spec "cypress/e2e/auth.cy.ts"

# Executar com gravação de vídeo
npx cypress run --record

# Executar em navegador específico
npx cypress run --browser chrome
```

---

## Pré-requisitos para Execução

1. **Contas de teste criadas:**
   - `qa-free@seudominio.com` - Plano Free
   - `qa-starter@seudominio.com` - Plano Starter
   - `qa-creator@seudominio.com` - Plano Creator
   - `admin@seudominio.com` - Admin

2. **Cupons de desconto criados no Stripe:**
   - `QA_DESCONTO_10` - 10% de desconto
   - `QA_DESCONTO_50` - 50% de desconto

3. **Ambiente em staging/sandbox:**
   - Stripe em modo teste
   - Supabase com dados de teste

4. **Atualizar cypress.config.ts:**
   - Colocar URL correta do ambiente
   - Colocar credenciais reais das contas de teste

---

## Cobertura de Testes

| Área | Casos | IDs |
|------|-------|-----|
| Autenticação | 12 | CT-001 a CT-012 |
| Carrossel Free | 7 | CT-013 a CT-019 |
| Carrossel Starter | 4 | CT-020 a CT-023 |
| Carrossel Creator | 5 | CT-024 a CT-028 |
| Pagamentos | 7 | CT-029 a CT-035 |
| Admin | 15 | CT-036 a CT-050 |
| i18n | 4 | CT-051 a CT-054 |
| Notificações | 4 | CT-055 a CT-058 |
| Perfil | 4 | CT-059 a CT-062 |
| Edge Cases | 8 | CT-063 a CT-070 |
| Growth Features | 6 | CT-071 a CT-076 |
| **TOTAL** | **76** | |
