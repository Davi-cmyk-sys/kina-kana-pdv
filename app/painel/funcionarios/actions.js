"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

function comErro(mensagem) {
  redirect("/painel/funcionarios?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/funcionarios?sucesso=" + encodeURIComponent(mensagem));
}

const PAPEIS_VALIDOS = [
  "admin",
  "gerente",
  "caixa",
  "cozinha",
  "entregador",
  "pendente",
];

export async function editarFuncionario(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString().trim();
  const papel = formData.get("papel")?.toString();
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    comErro("Funcionário inválido.");
  }
  if (!nome) {
    comErro("Digite o nome do funcionário.");
  }
  if (!PAPEIS_VALIDOS.includes(papel)) {
    comErro("Papel inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ nome, papel, ativo })
    .eq("id", id);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só admin pode editar funcionários."
        : error.message
    );
  }

  await registrarAuditoria(
    "funcionario.editar",
    `Editou o funcionário "${nome}" (papel: ${papel}, ativo: ${ativo ? "sim" : "não"}).`
  );
  comSucesso(`Dados de "${nome}" atualizados.`);
}
