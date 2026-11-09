"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import { SECOES_PAINEL } from "@/lib/secoesPainel";
import { normalizarNome } from "@/lib/nomes";
import {
  ESTADOS,
  FUNCOES_VALIDAS,
  cpfValido,
  nomeDaFuncao,
  papelDasFuncoes,
  soDigitos,
} from "@/lib/colaboradores";

// O login do Supabase exige um e-mail, mas no Kina Kana ninguém entra por
// e-mail: a pessoa escolhe o próprio nome na tela de login. Cada acesso novo
// recebe um e-mail interno, que nunca aparece na tela. O domínio ".invalid"
// é reservado (RFC 2606) e nunca recebe mensagem de verdade.
const DOMINIO_EMAIL_INTERNO = "usuarios.kinakana.invalid";

const BUCKET_FOTOS = "colaboradores";
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

const HREFS_PERSONALIZAVEIS = new Set(
  SECOES_PAINEL.filter((s) => s.href !== "/painel/auditoria").map(
    (s) => s.href
  )
);

function irParaLista(mensagem, tipo = "sucesso") {
  redirect(`/painel/funcionarios?${tipo}=` + encodeURIComponent(mensagem));
}

// Confere se quem está usando é uma conta master. Devolve o usuário logado.
async function exigirMaster() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("master")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, ehMaster: meuPerfil?.master === true };
}

function texto(formData, campo) {
  const valor = formData.get(campo)?.toString().trim();
  return valor ? valor : null;
}

function lerFormulario(formData) {
  const funcoes = formData
    .getAll("funcoes")
    .map((v) => v.toString())
    .filter((f) => FUNCOES_VALIDAS.includes(f));

  const uf = texto(formData, "uf")?.toUpperCase() ?? null;

  return {
    id: texto(formData, "id"),
    nomeCompleto: texto(formData, "nome_completo")?.replace(/\s+/g, " ") ?? null,
    cpf: soDigitos(formData.get("cpf")),
    dataNascimento: texto(formData, "data_nascimento"),
    cep: soDigitos(formData.get("cep")) || null,
    logradouro: texto(formData, "logradouro"),
    numero: texto(formData, "numero"),
    complemento: texto(formData, "complemento"),
    bairro: texto(formData, "bairro"),
    cidade: texto(formData, "cidade"),
    uf: uf && ESTADOS.includes(uf) ? uf : null,
    funcoes: [...new Set(funcoes)],
    temAcesso: formData.get("tem_acesso") === "on",
    usuario: texto(formData, "usuario")?.replace(/\s+/g, " ") ?? null,
    senha: formData.get("senha")?.toString() ?? "",
    secoesBloqueadas: formData
      .getAll("secoesBloqueadas")
      .map((v) => v.toString())
      .filter((href) => HREFS_PERSONALIZAVEIS.has(href)),
    foto: formData.get("foto"),
  };
}

function validar(dados) {
  if (!dados.nomeCompleto) return "Digite o nome completo.";
  if (!dados.cpf) return "Digite o CPF.";
  if (!cpfValido(dados.cpf)) return "CPF inválido. Confira os números.";
  if (!dados.dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataNascimento)) {
    return "Informe a data de nascimento.";
  }
  const nascimento = new Date(dados.dataNascimento + "T12:00:00");
  if (
    Number.isNaN(nascimento.getTime()) ||
    nascimento > new Date() ||
    nascimento.getFullYear() < 1900
  ) {
    return "Data de nascimento inválida.";
  }
  if (dados.cep && dados.cep.length !== 8) return "O CEP precisa ter 8 números.";
  if (!dados.funcoes.length) return "Marque pelo menos uma função na empresa.";
  if (dados.temAcesso && !dados.usuario) {
    return "Digite o nome de usuário que vai aparecer na tela de login.";
  }
  if (dados.senha && dados.senha.length < 6) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  const foto = dados.foto;
  if (foto && typeof foto !== "string" && foto.size) {
    if (!foto.type?.startsWith("image/")) return "A foto precisa ser uma imagem.";
    if (foto.size > TAMANHO_MAXIMO_FOTO) return "A foto é muito grande (máx. 5 MB).";
  }
  return null;
}

export async function salvarColaborador(estadoAnterior, formData) {
  const { supabase, user, ehMaster } = await exigirMaster();
  if (!ehMaster) {
    return { erro: "Só uma conta master pode cadastrar ou editar colaboradores." };
  }

  const dados = lerFormulario(formData);
  const erroValidacao = validar(dados);
  if (erroValidacao) return { erro: erroValidacao };

  const admin = createAdminClient();

  // Colaborador que já existe (edição) e o acesso dele, se tiver.
  let existente = null;
  let perfil = null;
  if (dados.id) {
    const { data } = await admin
      .from("colaboradores")
      .select("id, nome_completo, foto_caminho, perfil_id")
      .eq("id", dados.id)
      .maybeSingle();
    if (!data) return { erro: "Colaborador não encontrado." };
    existente = data;
    if (data.perfil_id) {
      const { data: p } = await admin
        .from("perfis")
        .select("id, nome, ativo, master")
        .eq("id", data.perfil_id)
        .maybeSingle();
      perfil = p ?? null;
    }
  }

  const ehVoceMesmo = perfil?.id === user.id;
  if (ehVoceMesmo) {
    // Ninguém tira o próprio acesso nem se bloqueia da tela de
    // Colaboradores sem querer.
    dados.temAcesso = true;
    dados.secoesBloqueadas = dados.secoesBloqueadas.filter(
      (href) => href !== "/painel/funcionarios"
    );
  }

  const papel = papelDasFuncoes(dados.funcoes);

  if (dados.temAcesso) {
    if (!perfil && !dados.senha) {
      return { erro: "Crie uma senha para o acesso ao sistema." };
    }
    // O nome de usuário é o que a pessoa escolhe na tela de login: não pode
    // repetir.
    const { data: perfis, error: erroPerfis } = await admin
      .from("perfis")
      .select("id, nome");
    if (erroPerfis) return { erro: erroPerfis.message };
    const usuarioNormalizado = normalizarNome(dados.usuario);
    const repetido = perfis?.find(
      (p) => p.id !== perfil?.id && normalizarNome(p.nome) === usuarioNormalizado
    );
    if (repetido) {
      return {
        erro: `Já existe um usuário "${repetido.nome}" no login. Escolha outro nome de usuário (por exemplo, com o sobrenome).`,
      };
    }
  }

  // 1) Dados do colaborador
  const linha = {
    nome_completo: dados.nomeCompleto,
    cpf: dados.cpf,
    data_nascimento: dados.dataNascimento,
    cep: dados.cep,
    logradouro: dados.logradouro,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade,
    uf: dados.uf,
    funcoes: dados.funcoes,
    atualizado_em: new Date().toISOString(),
  };

  let colaboradorId = existente?.id ?? null;
  if (existente) {
    const { error } = await supabase
      .from("colaboradores")
      .update(linha)
      .eq("id", existente.id);
    if (error) return { erro: mensagemErroBanco(error) };
  } else {
    const { data, error } = await supabase
      .from("colaboradores")
      .insert(linha)
      .select("id")
      .single();
    if (error) return { erro: mensagemErroBanco(error) };
    colaboradorId = data.id;
  }

  const avisos = [];

  // 2) Foto (se veio uma nova)
  const foto = dados.foto;
  if (foto && typeof foto !== "string" && foto.size) {
    const extensao = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    const caminho = `colaborador-${colaboradorId}/${Date.now()}.${extensao}`;
    const { error: erroFoto } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, foto, { contentType: foto.type, upsert: true });
    if (erroFoto) {
      avisos.push(`a foto não foi salva (${erroFoto.message})`);
    } else {
      await supabase
        .from("colaboradores")
        .update({ foto_caminho: caminho })
        .eq("id", colaboradorId);
      if (existente?.foto_caminho && existente.foto_caminho !== caminho) {
        await supabase.storage.from(BUCKET_FOTOS).remove([existente.foto_caminho]);
      }
    }
  }

  // 3) Acesso ao sistema
  let resumoAcesso = "sem acesso ao sistema";
  if (dados.temAcesso) {
    const secoes = dados.secoesBloqueadas.length ? dados.secoesBloqueadas : null;

    if (!perfil) {
      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
        email: `${crypto.randomUUID()}@${DOMINIO_EMAIL_INTERNO}`,
        password: dados.senha,
        email_confirm: true,
        user_metadata: { nome: dados.usuario, papel },
      });
      if (erroCriar || !criado?.user?.id) {
        avisos.push(
          `o acesso ao sistema não foi criado (${erroCriar?.message ?? "erro desconhecido"})`
        );
      } else {
        // O gatilho do banco já criou a linha em "perfis"; aqui garantimos
        // nome, nível de acesso e telas bloqueadas, e ligamos ao colaborador.
        await admin
          .from("perfis")
          .update({ nome: dados.usuario, papel, ativo: true, secoes_bloqueadas: secoes })
          .eq("id", criado.user.id);
        await supabase
          .from("colaboradores")
          .update({ perfil_id: criado.user.id })
          .eq("id", colaboradorId);
        resumoAcesso = `acesso criado como "${dados.usuario}"`;
      }
    } else {
      const { error: erroPerfil } = await supabase
        .from("perfis")
        .update({ nome: dados.usuario, papel, ativo: true, secoes_bloqueadas: secoes })
        .eq("id", perfil.id);
      if (erroPerfil) {
        avisos.push(`o acesso ao sistema não foi atualizado (${erroPerfil.message})`);
      } else {
        resumoAcesso = perfil.ativo
          ? `acesso como "${dados.usuario}"`
          : `acesso liberado de novo como "${dados.usuario}"`;
      }
      if (dados.senha) {
        const { error: erroSenha } = await admin.auth.admin.updateUserById(
          perfil.id,
          { password: dados.senha }
        );
        if (erroSenha) {
          avisos.push(`a senha não foi trocada (${erroSenha.message})`);
        } else {
          resumoAcesso += ", senha redefinida";
        }
      }
    }
  } else if (perfil?.ativo) {
    const { error: erroBloqueio } = await supabase
      .from("perfis")
      .update({ ativo: false })
      .eq("id", perfil.id);
    if (erroBloqueio) {
      avisos.push(`o acesso ao sistema não foi retirado (${erroBloqueio.message})`);
    } else {
      resumoAcesso = "acesso ao sistema retirado";
    }
  }

  await registrarAuditoria(
    existente ? "colaborador.editar" : "colaborador.cadastrar",
    `${existente ? "Editou" : "Cadastrou"} o colaborador "${dados.nomeCompleto}" (funções: ${dados.funcoes
      .map(nomeDaFuncao)
      .join(", ")}; ${resumoAcesso}).`
  );

  const mensagem = `${existente ? "Cadastro de" : "Colaborador"} "${dados.nomeCompleto}" ${
    existente ? "atualizado" : "cadastrado"
  } — ${resumoAcesso}.`;

  if (avisos.length) {
    irParaLista(`${mensagem} Atenção: ${avisos.join("; ")}.`, "erro");
  }
  irParaLista(mensagem);
}

function mensagemErroBanco(error) {
  if (error.code === "23505" && /cpf/i.test(error.message)) {
    return "Já existe um colaborador cadastrado com esse CPF.";
  }
  if (error.code === "42501") {
    return "Só uma conta master pode cadastrar ou editar colaboradores.";
  }
  return error.message;
}

export async function excluirColaborador(formData) {
  const id = formData.get("id")?.toString();
  const { supabase, user, ehMaster } = await exigirMaster();
  if (!ehMaster) {
    irParaLista("Só uma conta master pode excluir colaboradores.", "erro");
  }
  if (!id) {
    irParaLista("Colaborador inválido.", "erro");
  }

  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select("id, nome_completo, foto_caminho, perfil_id")
    .eq("id", id)
    .maybeSingle();

  if (!colaborador) {
    irParaLista("Colaborador não encontrado.", "erro");
  }
  if (colaborador.perfil_id === user.id) {
    irParaLista("Você não pode excluir o seu próprio cadastro.", "erro");
  }

  // A conta de login não é apagada (pedidos e caixas antigos continuam
  // mostrando quem fez); só fica sem acesso.
  if (colaborador.perfil_id) {
    await supabase
      .from("perfis")
      .update({ ativo: false })
      .eq("id", colaborador.perfil_id);
  }

  const { error } = await supabase
    .from("colaboradores")
    .delete()
    .eq("id", colaborador.id);
  if (error) {
    irParaLista(error.message, "erro");
  }

  if (colaborador.foto_caminho) {
    await supabase.storage.from(BUCKET_FOTOS).remove([colaborador.foto_caminho]);
  }

  await registrarAuditoria(
    "colaborador.excluir",
    `Excluiu o cadastro do colaborador "${colaborador.nome_completo}".`
  );
  irParaLista(`Cadastro de "${colaborador.nome_completo}" excluído.`);
}
