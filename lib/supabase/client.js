// Cliente do Supabase para uso em Client Components (código que roda no
// navegador). Usado nas próximas fases, quando tivermos telas com interação
// em tempo real (ex: cadastro de produtos, novo pedido).

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
