// No Next.js 16 este arquivo substitui o antigo "middleware.js" (o nome
// mudou para "proxy.js", mas a função é a mesma: rodar antes de cada página
// para checar se o usuário está logado).

import { updateSession } from "@/lib/supabase/proxyClient";

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
