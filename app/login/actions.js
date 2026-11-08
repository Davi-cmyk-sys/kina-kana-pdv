"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FORMATO_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A pessoa escolhe o usuário pelo nome e digita a senha. O login do
// Supabase continua exigindo um e-mail por baixo dos panos, então aqui no
// servidor buscamos o e-mail (real ou interno) da conta escolhida e entramos
// com ele — o e-mail nunca aparece na tela.
export async function entrar(estadoAnterior, formData) {
  const usuarioId = formData.get("usuario")?.toString() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";

  if (!FORMATO_ID.test(usuarioId)) {
    return { erro: "Digite seu nome e toque no seu usuário na lista." };
  }
  if (!senha) {
    return { erro: "Digite a sua senha." };
  }

  let email;
  try {
    const admin = createAdminClient();

    const { data: perfil } = await admin
      .from("perfis")
      .select("ativo")
      .eq("id", usuarioId)
      .maybeSingle();

    if (!perfil?.ativo) {
      return {
        erro: "Usuário não encontrado. Atualize a página e selecione de novo.",
      };
    }

    const { data, error } = await admin.auth.admin.getUserById(usuarioId);
    if (error || !data?.user?.email) {
      return {
        erro: "Usuário não encontrado. Atualize a página e selecione de novo.",
      };
    }
    email = data.user.email;
  } catch (err) {
    console.error("Erro ao buscar o usuário para login:", err);
    return { erro: "Erro inesperado ao entrar. Tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return {
      erro:
        error.code === "invalid_credentials"
          ? "Senha incorreta."
          : "Não foi possível entrar agora. Tente de novo em instantes.",
    };
  }

  redirect("/painel");
}
