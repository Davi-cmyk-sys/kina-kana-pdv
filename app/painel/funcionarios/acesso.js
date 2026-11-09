import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { temAcesso } from "@/lib/permissoes";

// As telas de colaboradores são só para conta master (têm CPF, endereço e
// data de nascimento). Devolve o cliente do Supabase e o usuário logado.
export async function exigirTelaColaboradores() {
  const { supabase, user, perfil: meuPerfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }

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
