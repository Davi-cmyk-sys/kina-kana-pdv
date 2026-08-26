// Cliente do Supabase usado nos componentes de servidor do Next.js.
//
// Nesta Fase 0 usamos só a chave pública (publishable/anon) — ela é segura
// para expor no navegador porque as regras de segurança do banco (Row Level
// Security, ou RLS) é que decidem o que pode ser lido/escrito com ela. Nas
// próximas fases, quando entrarmos em login (Supabase Auth), vamos evoluir
// para os pacotes @supabase/ssr para lidar com sessão de usuário.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copie .env.example para .env.local e preencha com os valores do seu projeto Supabase " +
      "(Project Settings → API)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
