// Cliente "admin" do Supabase — usa a service_role key, que tem poder total
// no banco (ignora RLS) e pode criar contas de login diretamente.
//
// NUNCA importe este arquivo em código que roda no navegador (Client
// Component). Ele só pode ser usado dentro de Route Handlers (app/api/...),
// que rodam no servidor. A chave nunca deve ter o prefixo NEXT_PUBLIC_.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Falta a variável SUPABASE_SERVICE_ROLE_KEY. Copie a chave 'service_role' " +
        "do Supabase (Project Settings → API Keys) para o .env.local — e depois " +
        "para as variáveis de ambiente do projeto na Vercel."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
