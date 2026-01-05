# Audisell

Transforme áudio em carrosséis profissionais para Instagram com IA.

## Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o-mini + Whisper

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes React
├── hooks/          # Custom hooks
├── lib/            # Utilitários e constantes
├── pages/          # Páginas da aplicação
└── integrations/   # Integrações (Supabase)

supabase/
└── functions/      # Edge Functions
    ├── generate-script/        # Geração de roteiro
    ├── generate-carousel-images/ # Geração de imagens
    ├── transcribe-audio/       # Transcrição com Whisper
    └── translate-content/      # Tradução de conteúdo
```

## Licença

Proprietário - Todos os direitos reservados.
