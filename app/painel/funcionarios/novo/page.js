import Link from "next/link";
import { SECOES_PAINEL } from "@/lib/secoesPainel";
import { exigirTelaColaboradores } from "../acesso";
import FormularioColaborador from "../FormularioColaborador";

export default async function NovoColaboradorPage() {
  await exigirTelaColaboradores();

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-6 shadow-sm sm:p-8">
      <Link
        href="/painel/funcionarios"
        className="text-sm font-medium text-[#1f6f3e] hover:underline"
      >
        ‹ Colaboradores
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-[#1c2a1f]">
        Novo colaborador
      </h1>
      <FormularioColaborador
        secoesPersonalizaveis={SECOES_PAINEL.filter(
          (s) => s.href !== "/painel/auditoria"
        )}
      />
    </main>
  );
}
