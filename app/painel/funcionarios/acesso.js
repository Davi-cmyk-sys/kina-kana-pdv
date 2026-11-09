import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temAcesso } from "@/lib/permissoes";

// As telas de colaboradores são só para conta master (têm CPF, endereço e
// data de nascimento). Devolve o cliente do Supabase e o usuário logado.
export async function exigirTelaColaboradores() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const podeAcessar = temAcesso("/painel/funcionarios", {
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeAcessar) {
    redirect("/painel");
  }

  return { supabase, user };
}

// Links temporários (1 hora) para mostrar as fotos, que ficam num lugar
// privado do Supabase.
export async function linksDasFotos(supabase, caminhos) {
  const validos = caminhos.filter(Boolean);
  if (!validos.length) return {};
  const { data } = await supabase.storage
    .from("colaboradores")
    .createSignedUrls(validos, 60 * 60);
  return Object.fromEntries(
    (data ?? [])
      .filter((item) => item.signedUrl && !item.error)
      .map((item) => [item.path, item.signedUrl])
  );
}
