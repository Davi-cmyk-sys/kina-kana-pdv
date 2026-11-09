import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatarCpf, nomeDaFuncao } from "@/lib/colaboradores";
import { exigirTelaColaboradores, linksDasFotos } from "./acesso";

export default async function ColaboradoresPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const { supabase, user } = await exigirTelaColaboradores();

  const { data: colaboradores } = await supabase
    .from("colaboradores")
    .select(
      "id, nome_completo, cpf, data_nascimento, funcoes, foto_caminho, perfil_id"
    )
    .order("nome_completo", { ascending: true });

  // Os usuários de login (perfis) são lidos com o cliente admin porque nem
  // toda conta master consegue ler os perfis dos outros pelas regras do banco.
  const idsPerfis = (colaboradores ?? [])
    .map((c) => c.perfil_id)
    .filter(Boolean);
  let perfisPorId = {};
  if (idsPerfis.length) {
    const admin = createAdminClient();
    const { data: perfis } = await admin
      .from("perfis")
      .select("id, nome, ativo, master")
      .in("id", idsPerfis);
    perfisPorId = Object.fromEntries((perfis ?? []).map((p) => [p.id, p]));
  }

  const fotos = await linksDasFotos(
    supabase,
    (colaboradores ?? []).map((c) => c.foto_caminho)
  );

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2a1f]">Colaboradores</h1>
          <p className="mt-1 text-sm text-[#5b6b5c]">
            Cadastro completo de quem trabalha na loja. Quem tiver acesso ao
            sistema entra escolhendo o próprio usuário na tela de login.
          </p>
        </div>
        <Link
          href="/painel/funcionarios/novo"
          className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33]"
        >
          + Novo colaborador
        </Link>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg bg-[#fbeae6] p-3 text-sm text-[#8a3320]">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mt-4 rounded-lg bg-[#e7f2ea] p-3 text-sm text-[#1f6f3e]">
          {sucesso}
        </div>
      )}

      {!colaboradores?.length ? (
        <p className="mt-6 text-sm text-[#8b968a]">
          Nenhum colaborador cadastrado ainda.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[#eceae0] overflow-hidden rounded-xl border border-[#dcdfd2]">
          {colaboradores.map((c) => {
            const perfil = c.perfil_id ? perfisPorId[c.perfil_id] : null;
            const temAcessoAtivo = perfil?.ativo === true;
            const incompleto = !c.cpf || !c.data_nascimento;
            const foto = c.foto_caminho ? fotos[c.foto_caminho] : null;
            const iniciais = c.nome_completo
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("");

            return (
              <li key={c.id}>
                <Link
                  href={`/painel/funcionarios/${c.id}`}
                  className="flex items-center gap-3 p-3 transition hover:bg-[#f6f4ee]"
                >
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={foto}
                      alt={c.nome_completo}
                      className="h-14 w-14 shrink-0 rounded-full border border-[#dcdfd2] object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f6f3e]/10 text-lg font-bold text-[#1f6f3e]">
                      {iniciais}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1c2a1f]">
                      {c.nome_completo}
                      {perfil?.id === user.id && (
                        <span className="ml-1 font-normal text-[#8b968a]">
                          (você)
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(c.funcoes ?? []).map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-[#eceae0] px-2 py-0.5 text-[11px] font-medium text-[#5b6b5c]"
                        >
                          {nomeDaFuncao(f)}
                        </span>
                      ))}
                      {perfil?.master && (
                        <span className="rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[11px] font-medium text-[#7a5b16]">
                          Master
                        </span>
                      )}
                      {incompleto && (
                        <span className="rounded-full bg-[#fbeae6] px-2 py-0.5 text-[11px] font-medium text-[#8a3320]">
                          Cadastro incompleto
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#8b968a]">
                      {c.cpf ? `CPF ${formatarCpf(c.cpf)} · ` : ""}
                      {temAcessoAtivo ? (
                        <span className="text-[#1f6f3e]">
                          Acesso ao sistema: {perfil.nome}
                        </span>
                      ) : (
                        "Sem acesso ao sistema"
                      )}
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-[#8b968a]">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
