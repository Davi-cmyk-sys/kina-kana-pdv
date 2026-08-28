# 🥟 Kina Kana PDV

Sistema de balcão da Kina Kana Pastelaria — reconstrução em Next.js + Supabase + Vercel, feita em etapas pequenas e testadas.

## Estado atual: Fase 1 — login e usuários (em andamento)

- ✅ **Fase 0** — Next.js + Supabase + GitHub + Vercel comprovadamente conectados.
- 🚧 **Fase 1** — login com Supabase Auth, papéis (admin/gerente/caixa/cozinha/entregador) e proteção de rotas.

Telas desta fase:

- `/login` — entrar com e-mail e senha.
- `/painel` — página protegida, mostra o nome e o papel de quem está logado, com botão de sair.

Toda rota (exceto `/login`) exige estar logado — quem não está é redirecionado automaticamente pelo `proxy.js`.

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
