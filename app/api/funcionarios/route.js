import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAPEIS_VALIDOS = ["admin", "gerente", "caixa", "cozinha", "entregador"];

export async function POST(request) {
  // 1. Confirma que quem está chamando essa rota está logado.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // 2. Confirma que essa pessoa é admin — só admin pode criar contas.
  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  if (meuPerfil?.papel !== "admin") {
    return NextResponse.json(
      { erro: "Só administradores podem cadastrar funcionários." },
      { status: 403 }
    );
  }

  // 3. Valida os dados enviados pelo formulário.
  const body = await request.json().catch(() => null);
  const nome = body?.nome?.toString().trim();
  const email = body?.email?.toString().trim();
  const senha = body?.senha?.toString();
  const papel = body?.papel?.toString();

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

  // 4. Cria a conta usando a service_role key (só o servidor tem acesso a
  // ela). O gatilho no banco (private.handle_new_user) cria o perfil
  // automaticamente com o nome e o papel enviados aqui.
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
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

  return NextResponse.json({ ok: true });
}
