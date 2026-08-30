import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularAcessos } from "@/lib/permissoes";

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const papel = perfil?.papel ?? "pendente";
  const nome = perfil?.nome ?? user.email;
  const aguardandoLiberacao = papel === "pendente";
  const secoes = calcularAcessos({
    papel,
    master: perfil?.master,
    secoesBloqueadas: perfil?.secoes_bloqueadas,
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1c2a1f]">Olá, {nome}</h1>
      <p className="mt-1 text-sm text-[#5b6b5c]">
        O que você quer fazer agora? Toque em uma opção abaixo — ou use a
        barra no topo pra trocar de tela a qualquer momento.
      </p>

      {aguardandoLiberacao && (
        <div className="mt-4 rounded-xl bg-[#fdf3e0] p-3 text-sm text-[#7a5b16]">
          Sua conta ainda não tem um papel definido no sistema. Peça para um
          administrador liberar seu acesso.
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {secoes.map((secao) => {
          const principal = secao.href === "/painel/pedido";
          return (
            <Link
              key={secao.href}
              href={secao.href}
              className={
                "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                (principal
                  ? "border-[#1f6f3e] bg-[#1f6f3e] text-white"
                  : "border-[#dcdfd2] bg-white text-[#1c2a1f] hover:border-[#1f6f3e]")
              }
            >
              <span className="text-4xl leading-none">{secao.icone}</span>
              <span className="text-sm font-bold">{secao.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
