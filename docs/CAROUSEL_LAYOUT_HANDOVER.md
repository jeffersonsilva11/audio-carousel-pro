# Handover UI → DEV: Sistema de Layout de Carrossel

## Visão Geral

Este documento descreve as especificações de layout para garantir consistência visual nos carrosséis exportados, baseado nas referências de design fornecidas.

---

## 1. TIPOS DE SLIDES

O carrossel possui 2 tipos distintos de layout:

### 1.1 Slide de Capa (Slide 1 - HOOK)
- **Função**: Capturar atenção inicial
- **Características**: Pode ter imagem de fundo, título grande, subtítulo opcional

### 1.2 Slides de Conteúdo (Slides 2 a N-1 - CONTENT/CTA/SIGNATURE)
- **Função**: Desenvolver conteúdo
- **Características**: Fundo sólido ou gradiente, profile, texto formatado

---

## 2. ESPECIFICAÇÕES DO SLIDE DE CAPA

### 2.1 Com Imagem de Fundo

```
┌─────────────────────────────────┐
│ [Contador: 1/X]            → TR │
│                                 │
│   ┌───────────────────────┐     │
│   │  IMAGEM DE FUNDO      │     │
│   │  (cover full)         │     │
│   │                       │     │
│   │  ┌─ Overlay ─────────┐│     │
│   │  │ Gradiente preto   ││     │
│   │  │ de baixo p/ cima  ││     │
│   │  │ rgba(0,0,0,0.0)   ││     │
│   │  │ ↓                 ││     │
│   │  │ rgba(0,0,0,0.8)   ││     │
│   │  └───────────────────┘│     │
│   └───────────────────────┘     │
│                                 │
│   [Subtítulo pequeno]     → BL  │
│   [TÍTULO GRANDE]         → BL  │
│   [TÍTULO LINHA 2]        → BL  │
│   [Highlight] ← palavra         │
│                                 │
│   ┌─ CTA Button ─────────┐      │
│   │ NOME DO CARROSSEL →  │ → BC │
│   └──────────────────────┘      │
│   ○ ○ ○ ○ ○ ○ ← dots            │
└─────────────────────────────────┘

TR = Top Right, BL = Bottom Left, BC = Bottom Center
```

**Especificações:**
- **Overlay Gradiente**:
  ```css
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 30%,
    rgba(0, 0, 0, 0.3) 60%,
    rgba(0, 0, 0, 0.0) 100%
  );
  ```

- **Contador**:
  - Posição: Top Right (40px do topo, 40px da direita)
  - Fonte: 28px, opacidade 0.5
  - Formato: "1/X"

- **Subtítulo (opcional)**:
  - Posição: Bottom area, acima do título
  - Fonte: 24-28px, weight 500
  - Cor: Branco com opacidade 0.9
  - Margin-bottom: 16px

- **Título Principal**:
  - Posição: Bottom area, margin-bottom 100px
  - Fonte: 72-84px, weight 800 (Extra Bold)
  - Cor: #FFFFFF (sempre branco)
  - Alinhamento: Left (padrão) ou conforme selecionado
  - Line-height: 1.1
  - Max-width: width - 160px (padding 80px cada lado)

- **Highlight de Palavra**:
  - Background: Cor de destaque (ex: #FF5722, #F97316)
  - Padding: 8px 16px
  - Border-radius: 4px
  - Aplicar em palavra-chave do título

- **CTA Button**:
  - Posição: Bottom center, 80px do bottom
  - Background: rgba(255,255,255,0.15)
  - Border: 1px solid rgba(255,255,255,0.3)
  - Padding: 12px 24px
  - Border-radius: 30px
  - Fonte: 14px, weight 600, uppercase
  - Ícone seta → à direita

### 2.2 Sem Imagem de Fundo

```
┌─────────────────────────────────┐
│ [Contador: 1/X]            → TR │
│                                 │
│         FUNDO SÓLIDO            │
│         ou GRADIENTE            │
│                                 │
│                                 │
│      ┌─────────────────┐        │
│      │  TÍTULO GRANDE  │  → CC  │
│      │  CENTRALIZADO   │        │
│      │  VERTICAL E     │        │
│      │  HORIZONTAL     │        │
│      └─────────────────┘        │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘

CC = Center Center
```

**Especificações:**
- **Background**:
  - Cor sólida (BLACK_WHITE ou WHITE_BLACK)
  - OU Gradiente selecionado

- **Título**:
  - Posição: Centro vertical e horizontal
  - Fonte: 64-72px, weight 700
  - Cor: Conforme estilo (branco no escuro, preto no claro)

---

## 3. ESPECIFICAÇÕES DOS SLIDES DE CONTEÚDO

```
┌─────────────────────────────────┐
│ ┌──┐ NOME             [X/Y] → TR│
│ │  │ @username         ← Profile│
│ └──┘                            │
│      ↑ 40px padding             │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Título do Slide:        │   │
│   │                         │   │
│   │ Texto do conteúdo com   │   │
│   │ múltiplas linhas e      │   │
│   │ quebra automática.      │   │
│   │                         │   │
│   │ Pode ter **negrito**    │   │
│   │ e _itálico_ inline.     │   │
│   │                         │   │
│   └─────────────────────────┘   │
│              ↑                  │
│   Centralizado verticalmente    │
│                                 │
│                        [→] → BR │
└─────────────────────────────────┘

TR = Top Right, BR = Bottom Right
```

### 3.1 Profile Section

**Especificações:**
- **Avatar**:
  - Tamanho: 56-60px (círculo)
  - Posição: Top-left (40px, 40px) - padrão
  - Pode ser configurado para outros cantos
  - Com foto: crop circular, object-fit cover
  - Sem foto: iniciais em círculo com bg rgba(255,255,255,0.15)

- **Nome**:
  - Posição: À direita do avatar (gap: 12px)
  - Fonte: 20px, weight 600
  - Cor: Branco/Preto conforme estilo
  - Pode incluir ícone de verificado (✓)

- **Username**:
  - Posição: Abaixo do nome
  - Fonte: 16px, weight 500
  - Cor: rgba(255,255,255,0.7) ou equivalente
  - Formato: "@username"

### 3.2 Texto Principal

**Especificações:**
- **Área de texto**:
  - Padding horizontal: 80px
  - Posição vertical: Centralizado (considerando profile e footer)
  - Max-width: width - 160px

- **Tipografia**:
  - Fonte base: Conforme selecionado (Inter padrão)
  - Tamanho dinâmico baseado no comprimento:
    - < 80 chars: 56px
    - 80-150 chars: 48px
    - 150-250 chars: 40px
    - 250-400 chars: 36px
    - > 400 chars: 32px
  - Weight: 500 (medium) para corpo
  - Weight: 700 (bold) para títulos inline
  - Line-height: 1.5
  - Letter-spacing: -0.02em

- **Alinhamento**:
  - Configurável: left | center | right
  - Padrão: center

### 3.3 Contador de Slides

**Especificações:**
- Posição: Top-right (40px, 40px)
- Fonte: 24-28px, weight 500
- Cor: rgba(255,255,255,0.5)
- Formato: "X/Y"

### 3.4 Indicador de Navegação (opcional)

- Posição: Bottom-right (40px, 40px)
- Ícone: Seta circular ou dedo apontando
- Tamanho: 32px
- Opacidade: 0.7

---

## 4. DIMENSÕES E FORMATOS

| Formato | Largura | Altura | Aspect Ratio |
|---------|---------|--------|--------------|
| POST_SQUARE | 1080 | 1080 | 1:1 |
| POST_PORTRAIT | 1080 | 1350 | 4:5 |
| STORY | 1080 | 1920 | 9:16 |

### Ajustes por Formato

**POST_SQUARE (1080x1080)**:
- Título capa: 64-72px
- Texto conteúdo: 36-48px
- Padding: 80px

**POST_PORTRAIT (1080x1350)**:
- Título capa: 72-84px
- Texto conteúdo: 40-52px
- Padding: 80px
- Mais espaço vertical para texto

**STORY (1080x1920)**:
- Título capa: 80-96px
- Texto conteúdo: 44-56px
- Padding: 60px horizontal, 120px vertical
- Safe areas: top 120px, bottom 160px

---

## 5. CORES E ESTILOS

### 5.1 Temas Base

```typescript
const STYLES = {
  BLACK_WHITE: {
    background: '#0A0A0A',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    overlay: 'rgba(0,0,0,0.5)'
  },
  WHITE_BLACK: {
    background: '#FFFFFF',
    text: '#0A0A0A',
    textSecondary: 'rgba(0,0,0,0.6)',
    overlay: 'rgba(255,255,255,0.5)'
  }
};
```

### 5.2 Gradientes

Quando gradiente selecionado, sempre aplicar overlay escuro para legibilidade:
```svg
<rect fill="rgba(0,0,0,0.4)" /> <!-- sobre gradiente -->
```

### 5.3 Cor de Destaque (Highlight)

Cor padrão para highlights e CTAs:
- Primary: #F97316 (laranja)
- Alt 1: #EF4444 (vermelho)
- Alt 2: #8B5CF6 (roxo)

---

## 6. FONTES

### Fontes Disponíveis

| ID | Nome | Family | Uso Recomendado |
|----|------|--------|-----------------|
| inter | Inter | Inter, system-ui, sans-serif | Padrão, legível |
| montserrat | Montserrat | Montserrat, sans-serif | Moderno |
| playfair | Playfair Display | Playfair Display, serif | Elegante |
| bebas | Bebas Neue | Bebas Neue, sans-serif | Impacto |
| poppins | Poppins | Poppins, sans-serif | Clean |
| oswald | Oswald | Oswald, sans-serif | Bold |
| lora | Lora | Lora, serif | Editorial |
| roboto | Roboto | Roboto, sans-serif | Neutro |

### Pesos Usados
- 400: Regular (não usar)
- 500: Medium (corpo de texto)
- 600: Semi-bold (subtítulos)
- 700: Bold (títulos)
- 800: Extra-bold (títulos de capa)

---

## 7. IMPLEMENTAÇÃO SVG

### 7.1 Estrutura Base

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- Definições (gradientes, clips, filtros) -->
  <defs>
    <!-- Gradient para overlay da capa -->
    <linearGradient id="coverOverlay" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.85)"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.5)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>

    <!-- Clip para avatar circular -->
    <clipPath id="avatarClip">
      <circle cx="{avatarCx}" cy="{avatarCy}" r="{avatarRadius}"/>
    </clipPath>
  </defs>

  <!-- Background Layer -->
  <g id="background">
    <!-- Cor sólida ou gradiente ou imagem -->
  </g>

  <!-- Overlay Layer (se necessário) -->
  <g id="overlay">
    <!-- Overlay escuro para imagens/gradientes -->
  </g>

  <!-- Profile Layer -->
  <g id="profile">
    <!-- Avatar + Nome + Username -->
  </g>

  <!-- Content Layer -->
  <g id="content">
    <!-- Texto principal -->
  </g>

  <!-- UI Layer -->
  <g id="ui">
    <!-- Contador, botões, dots -->
  </g>

  <!-- Watermark Layer (se aplicável) -->
  <g id="watermark">
    <!-- Marca d'água para free users -->
  </g>
</svg>
```

### 7.2 Função de Word Wrap Melhorada

```typescript
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string
): { lines: string[], totalHeight: number } {
  // Estimativa mais precisa de largura por caractere
  const avgCharWidth = fontSize * 0.52; // Ajustar por fonte
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.5;
  const totalHeight = lines.length * lineHeight;

  return { lines, totalHeight };
}
```

### 7.3 Função para Calcular Font Size Dinâmico

```typescript
function calculateFontSize(
  textLength: number,
  slideType: 'cover' | 'content',
  format: 'POST_SQUARE' | 'POST_PORTRAIT' | 'STORY'
): number {
  const baseSize = {
    POST_SQUARE: { cover: 64, content: 44 },
    POST_PORTRAIT: { cover: 72, content: 48 },
    STORY: { cover: 80, content: 52 }
  };

  const base = baseSize[format][slideType];

  // Reduzir tamanho para textos longos
  if (textLength > 400) return base * 0.7;
  if (textLength > 250) return base * 0.8;
  if (textLength > 150) return base * 0.9;
  if (textLength < 50) return base * 1.1;

  return base;
}
```

---

## 8. CHECKLIST DE IMPLEMENTAÇÃO

### 8.1 Slide de Capa

- [ ] Detectar se é slide 1 (HOOK) para aplicar layout de capa
- [ ] Verificar se há imagem de fundo (coverImageUrl)
- [ ] Com imagem: aplicar overlay gradiente de baixo para cima
- [ ] Com imagem: posicionar título na área inferior
- [ ] Sem imagem: centralizar título vertical e horizontalmente
- [ ] Título sempre em branco (#FFFFFF) independente do estilo
- [ ] Aplicar font-weight extra-bold (800) no título da capa
- [ ] Suportar highlight de palavra (opcional - future feature)

### 8.2 Slides de Conteúdo

- [ ] Aplicar layout padrão com profile top-left
- [ ] Centralizar texto verticalmente na área disponível
- [ ] Calcular font size dinamicamente baseado no comprimento
- [ ] Aplicar alinhamento de texto conforme configuração
- [ ] Manter espaçamento consistente (padding 80px)
- [ ] Contador de slides no canto superior direito

### 8.3 Profile Identity

- [ ] Renderizar avatar circular (foto ou iniciais)
- [ ] Nome com font-weight 600
- [ ] Username com opacidade reduzida
- [ ] Suportar posicionamento configurável
- [ ] Gap consistente entre avatar e texto (12px)

### 8.4 Elementos UI

- [ ] Contador de slides: "X/Y" com opacidade 0.5
- [ ] Watermark para usuários free (se aplicável)
- [ ] Manter consistência de fontes em todo o slide

---

## 9. TESTES DE QUALIDADE

### Verificar em cada exportação:

1. **Legibilidade**: Texto deve ser legível em todos os tamanhos
2. **Contraste**: Mínimo 4.5:1 entre texto e fundo
3. **Alinhamento**: Elementos devem estar alinhados corretamente
4. **Espaçamento**: Margens e paddings consistentes
5. **Responsividade**: Layout deve funcionar em todos os formatos
6. **Consistência**: Todos os slides do mesmo carrossel devem ter estilo uniforme

---

## 10. PRÓXIMOS PASSOS

1. Refatorar `generateSlideSVG` para usar layout diferenciado para capa
2. Implementar overlay gradiente para imagens de capa
3. Ajustar cálculo de font size dinâmico
4. Melhorar posicionamento vertical do texto
5. Adicionar suporte a highlight de palavras (v2)
6. Adicionar CTA button no slide de capa (v2)

---

*Documento criado: 2026-01-02*
*Autor: UI Senior Specialist*
*Para: Fullstack Senior Developer*
