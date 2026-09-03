import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import { SECOES_PAINEL } from "@/lib/secoesPainel";

const PAPEIS_VALIDOS = ["admin", "gerente", "caixa", "cozinha", "entregador"];
const HREFS_PERSONALIZAVEIS = new Set(
  SECOES_PAINEL.filter((s) => s.href !== "/painel/auditoria").map(
    (s) => s.href
  )
);

export async function POST(request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("master")
    .eq("id", user.id)
    .maybeSingle();

  if (!meuPerfil?.master) {
    return NextResponse.json(
      { erro: "Só as contas master podem cadastrar funcionários." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const nome = body?.nome?.toString().trim();
  const email = body?.email?.toString().trim();
  const senha = body?.senha?.toString();
  const papel = body?.papel?.toString();
  const secoesBloqueadas = Array.isArray(body?.secoesBloqueadas)
    ? body.secoesBloqueadas
        .map((v) => v?.toString())
        .filter((href) => HREFS_PERSONALIZAVEIS.has(href))
    : [];

  if (!nome || !email || !senha || !PAPEIS_VALIDOS.includes(papel)) {
    return NextResponse.json(
      { erro: "Preencha nome, e-mail, senha e papel corretamente." },
      { status: 400 }
    );
  }

  if (senha.length < 6) {
    return NextResponse.json(
      { erro: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, papel },
  });

  if (error) {
    const mensagem =
      error.code === "email_exists"
        ? "Já existe uma conta com esse e-mail."
        : error.message;
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }

  // O gatilho que cria a linha em "perfis" só sabe preencher nome/papel.
  // Agora que a conta existe, gravamos por cima quais telas ficam
  // bloqueadas para essa pessoa (se alguma foi escolhida).
  if (secoesBloqueadas.length && criado?.user?.id) {
    await admin
      .from("perfis")
      .update({ secoes_bloqueadas: secoesBloqueadas })
      .eq("id", criado.user.id);
  }

  await registrarAuditoria(
    "funcionario.cadastrar",
    `Cadastrou o funcionário "${nome}" (papel: ${papel}, telas bloqueadas: ${
      secoesBloqueadas.length ? secoesBloqueadas.join(", ") : "nenhuma"
    }).`
  );

  return NextResponse.json({ ok: true });
}
