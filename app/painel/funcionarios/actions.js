"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import { SECOES_PAINEL } from "@/lib/secoesPainel";
import { normalizarNome } from "@/lib/nomes";

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

const HREFS_PERSONALIZAVEIS = new Set(
  SECOES_PAINEL.filter((s) => s.href !== "/painel/auditoria").map(
    (s) => s.href
  )
);

export async function editarFuncionario(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString().trim();
  const papel = formData.get("papel")?.toString();
  const ativo = formData.get("ativo") === "on";
  const novaSenha = formData.get("novaSenha")?.toString() ?? "";
  let secoesBloqueadas = formData
    .getAll("secoesBloqueadas")
    .map((v) => v.toString())
    .filter((href) => HREFS_PERSONALIZAVEIS.has(href));

  if (!id) {
    comErro("Funcionário inválido.");
  }
  if (!nome) {
    comErro("Digite o nome do funcionário.");
  }
  if (!PAPEIS_VALIDOS.includes(papel)) {
    comErro("Papel inválido.");
  }
  if (novaSenha && novaSenha.length < 6) {
    comErro("A nova senha precisa ter pelo menos 6 caracteres.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // O nome é o que identifica a pessoa no login, então não pode repetir.
  const { data: outrosPerfis } = await supabase
    .from("perfis")
    .select("id, nome")
    .neq("id", id);
  const nomeNormalizado = normalizarNome(nome);
  if (outrosPerfis?.some((p) => normalizarNome(p.nome) === nomeNormalizado)) {
    comErro(
      `Já existe outro usuário chamado "${nome}". Use um nome diferente (por exemplo, com o sobrenome).`
    );
  }

  // Trocar senha de outra pessoa é só para conta master (sem e-mail, não
  // existe "esqueci a senha" — quem resolve é o master).
  if (novaSenha) {
    const { data: meuPerfil } = await supabase
      .from("perfis")
      .select("master")
      .eq("id", user.id)
      .maybeSingle();

    if (!meuPerfil?.master) {
      comErro("Só uma conta master pode definir a senha de um funcionário.");
    }
  }

  // Ninguém pode se bloquear da própria tela de Funcionários — evita
  // travar o próprio acesso sem querer.
  if (user && id === user.id) {
    secoesBloqueadas = secoesBloqueadas.filter(
      (href) => href !== "/painel/funcionarios"
    );
  }

  const { error } = await supabase
    .from("perfis")
    .update({
      nome,
      papel,
      ativo,
      secoes_bloqueadas: secoesBloqueadas.length ? secoesBloqueadas : null,
    })
    .eq("id", id);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só uma conta master pode editar funcionários."
        : error.message
    );
  }

  if (novaSenha) {
    const admin = createAdminClient();
    const { error: erroSenha } = await admin.auth.admin.updateUserById(id, {
      password: novaSenha,
    });

    if (erroSenha) {
      comErro(
        `Os dados foram salvos, mas a senha não foi trocada: ${erroSenha.message}`
      );
    }
  }

  await registrarAuditoria(
    "funcionario.editar",
    `Editou o funcionário "${nome}" (papel: ${papel}, ativo: ${ativo ? "sim" : "não"}, telas bloqueadas: ${
      secoesBloqueadas.length ? secoesBloqueadas.join(", ") : "nenhuma"
    }${novaSenha ? ", senha redefinida" : ""}).`
  );
  comSucesso(
    novaSenha
      ? `Dados de "${nome}" atualizados e senha redefinida.`
      : `Dados de "${nome}" atualizados.`
  );
}

export async function apagarFuncionario(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString() ?? "";

  if (!id) {
    comErro("Funcionário inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (id === user.id) {
    comErro("Você não pode excluir a sua própria conta.");
  }

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("master")
    .eq("id", user.id)
    .maybeSingle();

  if (!meuPerfil?.master) {
    comErro("Só uma conta master pode excluir funcionários.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    comErro(error.message);
  }

  await registrarAuditoria(
    "funcionario.apagar",
    `Excluiu a conta do funcionário "${nome}".`
  );
  comSucesso(`A conta de "${nome}" foi excluída.`);
}
