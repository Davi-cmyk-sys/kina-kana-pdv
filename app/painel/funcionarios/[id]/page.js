import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECOES_PAINEL } from "@/lib/secoesPainel";
import BotaoApagar from "@/components/BotaoApagar";
import { exigirTelaColaboradores, linksDasFotos } from "../acesso";
import FormularioColaborador from "../FormularioColaborador";
import { excluirColaborador } from "../actions";

export default async function EditarColaboradorPage({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const { supabase, user } = await exigirTelaColaboradores();

  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select(
      "id, nome_completo, cpf, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, uf, foto_caminho, funcoes, perfil_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!colaborador) {
    notFound();
  }

  let perfil = null;
  if (colaborador.perfil_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("perfis")
      .select("id, nome, ativo, master, secoes_bloqueadas")
      .eq("id", colaborador.perfil_id)
      .maybeSingle();
    perfil = data ?? null;
  }

  const fotos = await linksDasFotos(supabase, [colaborador.foto_caminho]);
  const ehVoceMesmo = perfil?.id === user.id;

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-6 shadow-sm sm:p-8">
      <Link
        href="/painel/funcionarios"
        className="text-sm font-medium text-[#1f6f3e] hover:underline"
      >
        ‹ Colaboradores
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-[#1c2a1f]">
        {colaborador.nome_completo}
      </h1>

      <FormularioColaborador
        colaborador={colaborador}
        perfil={perfil}
        fotoUrl={
          colaborador.foto_caminho ? fotos[colaborador.foto_caminho] : null
        }
        ehVoceMesmo={ehVoceMesmo}
        secoesPersonalizaveis={SECOES_PAINEL.filter(
          (s) => s.href !== "/painel/auditoria"
        )}
      />

      {!ehVoceMesmo && (
        <div className="mt-8 border-t border-[#eceae0] pt-4">
          <BotaoApagar
            acao={excluirColaborador}
            campos={{ id: colaborador.id }}
            confirmacao={`Excluir o cadastro de "${colaborador.nome_completo}"? Se tiver acesso ao sistema, o acesso é retirado. Pedidos e caixas antigos continuam no histórico.`}
            className="text-sm font-medium text-[#b3432f] hover:underline"
            texto="Excluir cadastro"
          />
        </div>
      )}
    </main>
  );
}
