// Cliente do Supabase para uso em Server Components, Server Actions e Route
// Handlers. Ele lê/escreve a sessão do usuário logado através dos cookies da
// requisição — por isso precisa do pacote @supabase/ssr (diferente do cliente
// simples usado na Fase 0, que não lidava com login).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component (não pode escrever
            // cookies). Sem problema: o proxy.js já renova a sessão em toda
            // requisição, então isso só acontece em leituras que não
            // precisam alterar o cookie.
          }
        },
      },
    }
  );
}
