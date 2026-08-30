// Lógica de proteção de rotas, usada pelo proxy.js (arquivo na raiz do
// projeto). Roda antes de qualquer página, em toda requisição:
// - Renova a sessão do usuário (se ele estiver logado).
// - Redireciona para /login quem não está logado e tenta ver uma página
//   protegida.
// - Redireciona para /painel quem já está logado e tenta ver a tela de login.

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const ROTAS_PUBLICAS = ["/login"];

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isRotaPublica = ROTAS_PUBLICAS.some((rota) =>
    pathname.startsWith(rota)
  );

  // O aparelho fica ligado o dia inteiro e é usado por vários funcionários,
  // então toda vez que alguém "entra no sistema" pela página inicial
  // precisa fazer login de novo — mesmo que já existisse uma sessão salva
  // de quem usou por último.
  if (pathname === "/" && user) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirecionamento = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirecionamento.cookies.set(cookie);
    });
    return redirecionamento;
  }

  if (!user && !isRotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isRotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return response;
}
