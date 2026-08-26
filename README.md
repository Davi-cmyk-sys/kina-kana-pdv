# 🥟 Kina Kana PDV

Sistema de balcão da Kina Kana Pastelaria — reconstrução em Next.js + Supabase + Vercel, feita em etapas pequenas e testadas.

## Estado atual: Fase 0 — base conectada

Esta versão ainda **não é o sistema de verdade**. É só uma página de teste que prova que quatro peças estão conectadas entre si:

1. **Next.js** — o código roda e monta a página.
2. **Supabase** — o banco de dados na nuvem, lido pela página.
3. **GitHub** — onde este código fica salvo e versionado.
4. **Vercel** — onde o site fica publicado, atualizado a cada push no GitHub.

Se a página mostrar "Conectado ao Supabase" com uma mensagem, a Fase 0 está completa e podemos seguir para construir as telas reais do PDV.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # depois preencha com os valores do seu projeto Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Veja `.env.example`. Os valores reais vêm do painel do Supabase em **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — a Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — a chave pública (publishable/anon).

Essas variáveis também precisam ser configuradas no painel da Vercel (**Project → Settings → Environment Variables**) para o site publicado funcionar.
