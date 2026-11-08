import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import FormularioLogin from "./FormularioLogin";

// Lista de quem pode entrar (só nome e id — nada de e-mail, papel ou outro
// dado). Usa o cliente admin porque quem está na tela de login ainda não
// entrou, e as regras do banco não deixam visitante ler a tabela de perfis.
async function carregarUsuarios() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("perfis")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw error;
    return { usuarios: data ?? [], erro: null };
  } catch (err) {
    console.error("Erro ao carregar usuários para o login:", err);
    return {
      usuarios: [],
      erro: "Não foi possível carregar a lista de usuários. Atualize a página e tente de novo.",
    };
  }
}

export default async function LoginPage() {
  // A lista precisa ser lida a cada acesso (funcionário novo aparece na
  // hora), nunca gerada uma vez só no build.
  await connection();
  const { usuarios, erro } = await carregarUsuarios();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee] p-6">
      <main className="w-full max-w-sm rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Kina Kana"
            className="h-36 w-36 rounded-full object-cover shadow-sm"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#1c2a1f]">Entrar</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Escolha seu nome na lista e digite sua senha.
        </p>

        <FormularioLogin usuarios={usuarios} erroInicial={erro} />
      </main>
    </div>
  );
}
