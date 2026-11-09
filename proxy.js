// No Next.js 16 este arquivo substitui o antigo "middleware.js" (o nome
// mudou para "proxy.js", mas a função é a mesma: rodar antes de cada página
// para checar se o usuário está logado).

import { updateSession } from "@/lib/supabase/proxyClient";

export async function proxy(request) {
  return updateSession(request);
}

// Ícones e manifesto do app ficam de fora: o celular busca esses arquivos
// sem estar logado (ao adicionar o atalho na tela de início) e não pode ser
// mandado para a tela de login.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|apple-touch-icon|manifest.webmanifest|icones/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
