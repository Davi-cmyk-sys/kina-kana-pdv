"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import CampoFoto from "@/components/CampoFoto";
import {
  ESTADOS,
  FUNCOES,
  formatarCep,
  formatarCpf,
  nomeDaFuncao,
  papelDasFuncoes,
} from "@/lib/colaboradores";
import { salvarColaborador } from "./actions";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] bg-white px-3 py-2 text-base text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e] sm:text-sm";
const rotuloClasse = "block text-sm font-medium text-[#1c2a1f]";
const blocoClasse = "rounded-xl border border-[#dcdfd2] p-4";

// Sugestão de usuário para o login: primeiro e último nome, em maiúsculas.
function sugerirUsuario(nomeCompleto) {
  const partes = (nomeCompleto ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  const escolhidas = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : partes;
  return escolhidas.join(" ").toUpperCase();
}

export default function FormularioColaborador({
  colaborador = null,
  perfil = null,
  fotoUrl = null,
  secoesPersonalizaveis,
  ehVoceMesmo = false,
}) {
  const [estado, acaoSalvar, salvando] = useActionState(salvarColaborador, {
    erro: null,
  });

  const [nomeCompleto, setNomeCompleto] = useState(colaborador?.nome_completo ?? "");
  const [cpf, setCpf] = useState(formatarCpf(colaborador?.cpf ?? ""));
  const [cep, setCep] = useState(formatarCep(colaborador?.cep ?? ""));
  const [funcoes, setFuncoes] = useState(colaborador?.funcoes ?? []);
  const [temAcesso, setTemAcesso] = useState(
    ehVoceMesmo || perfil?.ativo === true
  );
  const [usuario, setUsuario] = useState(perfil?.nome ?? "");
  const [aviso, setAviso] = useState(null);

  const papel = papelDasFuncoes(funcoes);
  const jaTemLogin = Boolean(perfil);

  function alternarFuncao(valor) {
    setAviso(null);
    setFuncoes((atuais) =>
      atuais.includes(valor)
        ? atuais.filter((f) => f !== valor)
        : [...atuais, valor]
    );
  }

  function alternarAcesso(evento) {
    const ligado = evento.target.checked;
    setTemAcesso(ligado);
    if (ligado && !usuario) {
      setUsuario(sugerirUsuario(nomeCompleto));
    }
  }

  // Envio manual (sem <form action>) para o React não apagar o que foi
  // digitado quando o servidor devolve um erro.
  function aoEnviar(evento) {
    evento.preventDefault();
    if (!funcoes.length) {
      setAviso("Marque pelo menos uma função na empresa.");
      return;
    }
    setAviso(null);
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acaoSalvar(dados));
  }

  const mensagemErro = aviso ?? estado?.erro;

  return (
    <form onSubmit={aoEnviar} className="mt-6 space-y-5">
      {colaborador?.id && <input type="hidden" name="id" value={colaborador.id} />}

      {/* Dados pessoais */}
      <section className={blocoClasse}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#5b6b5c]">
          Dados pessoais
        </h2>
        <div className="mt-3">
          <span className={rotuloClasse}>Foto</span>
          <CampoFoto
            name="foto"
            fotoAtual={fotoUrl}
            formatoPrevia="redondo"
            className="w-full text-sm text-[#5b6b5c] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eceae0] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1c2a1f]"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nome_completo" className={rotuloClasse}>
              Nome completo
            </label>
            <input
              id="nome_completo"
              name="nome_completo"
              type="text"
              required
              autoComplete="off"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className={campoClasse}
              placeholder="Ex: Maria Aparecida da Silva"
            />
          </div>
          <div>
            <label htmlFor="cpf" className={rotuloClasse}>
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              required
              autoComplete="off"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              className={campoClasse}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label htmlFor="data_nascimento" className={rotuloClasse}>
              Data de nascimento
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              required
              defaultValue={colaborador?.data_nascimento ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className={blocoClasse}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#5b6b5c]">
          Endereço completo
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="cep" className={rotuloClasse}>
              CEP
            </label>
            <input
              id="cep"
              name="cep"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cep}
              onChange={(e) => setCep(formatarCep(e.target.value))}
              className={campoClasse}
              placeholder="00000-000"
            />
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="logradouro" className={rotuloClasse}>
              Rua / Avenida
            </label>
            <input
              id="logradouro"
              name="logradouro"
              type="text"
              defaultValue={colaborador?.logradouro ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="numero" className={rotuloClasse}>
              Número
            </label>
            <input
              id="numero"
              name="numero"
              type="text"
              defaultValue={colaborador?.numero ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="complemento" className={rotuloClasse}>
              Complemento
            </label>
            <input
              id="complemento"
              name="complemento"
              type="text"
              defaultValue={colaborador?.complemento ?? ""}
              className={campoClasse}
              placeholder="Apto, bloco, ponto de referência"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="bairro" className={rotuloClasse}>
              Bairro
            </label>
            <input
              id="bairro"
              name="bairro"
              type="text"
              defaultValue={colaborador?.bairro ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cidade" className={rotuloClasse}>
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              type="text"
              defaultValue={colaborador?.cidade ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="uf" className={rotuloClasse}>
              UF
            </label>
            <select
              id="uf"
              name="uf"
              defaultValue={colaborador?.uf ?? ""}
              className={campoClasse}
            >
              <option value="">—</option>
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Funções */}
      <section className={blocoClasse}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#5b6b5c]">
          Funções na empresa
        </h2>
        <p className="mt-1 text-xs text-[#8b968a]">
          Pode marcar mais de uma.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FUNCOES.map((f) => {
            const marcada = funcoes.includes(f.valor);
            return (
              <label
                key={f.valor}
                className={
                  "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (marcada
                    ? "border-[#1f6f3e] bg-[#e7f2ea] text-[#1f6f3e]"
                    : "border-[#dcdfd2] bg-white text-[#1c2a1f] hover:bg-[#f6f4ee]")
                }
              >
                <input
                  type="checkbox"
                  name="funcoes"
                  value={f.valor}
                  checked={marcada}
                  onChange={() => alternarFuncao(f.valor)}
                  className="h-4 w-4 accent-[#1f6f3e]"
                />
                {f.rotulo}
              </label>
            );
          })}
        </div>
      </section>

      {/* Acesso ao sistema */}
      <section className={blocoClasse}>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-bold text-[#1c2a1f]">
              Tem acesso ao sistema
            </span>
            <span className="block text-xs text-[#8b968a]">
              {ehVoceMesmo
                ? "Você não pode tirar o seu próprio acesso."
                : "Ligado: a pessoa aparece na lista da tela de login."}
            </span>
          </span>
          <span className="relative inline-flex shrink-0 items-center">
            <input
              type="checkbox"
              name="tem_acesso"
              checked={temAcesso}
              disabled={ehVoceMesmo}
              onChange={alternarAcesso}
              className="peer sr-only"
            />
            <span className="h-7 w-12 rounded-full bg-[#dcdfd2] transition peer-checked:bg-[#1f6f3e] peer-focus-visible:ring-2 peer-focus-visible:ring-[#1f6f3e] peer-focus-visible:ring-offset-2 peer-disabled:opacity-60" />
            <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
        {ehVoceMesmo && <input type="hidden" name="tem_acesso" value="on" />}

        {temAcesso && (
          <div className="mt-4 grid gap-3 border-t border-[#eceae0] pt-4 sm:grid-cols-2">
            <div>
              <label htmlFor="usuario" className={rotuloClasse}>
                Usuário do sistema
              </label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                required
                autoComplete="off"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className={campoClasse}
                placeholder="Nome que aparece no login"
              />
              <p className="mt-1 text-xs text-[#8b968a]">
                É o nome que a pessoa escolhe na lista para entrar.
              </p>
            </div>
            <div>
              <label htmlFor="senha" className={rotuloClasse}>
                {jaTemLogin ? "Nova senha" : "Criar senha"}
              </label>
              <input
                id="senha"
                name="senha"
                type="text"
                minLength={6}
                required={!jaTemLogin}
                autoComplete="off"
                className={campoClasse}
                placeholder={
                  jaTemLogin
                    ? "deixe em branco para manter"
                    : "mínimo 6 caracteres"
                }
              />
            </div>
            <p className="rounded-lg bg-[#f6f4ee] p-2 text-xs text-[#5b6b5c] sm:col-span-2">
              Nível de acesso:{" "}
              <strong>{papel ? nomeDaFuncao(papel) : "marque uma função"}</strong>{" "}
              (segue a função mais alta marcada).
              {perfil?.master && " Esta é uma conta master: vê tudo no sistema."}
            </p>

            <details className="sm:col-span-2">
              <summary className="cursor-pointer text-sm font-medium text-[#1f6f3e]">
                Bloquear telas para essa pessoa (opcional)
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                {secoesPersonalizaveis
                  .filter(
                    (s) => !(ehVoceMesmo && s.href === "/painel/funcionarios")
                  )
                  .map((s) => (
                    <label
                      key={s.href}
                      className="flex items-center gap-1.5 text-xs text-[#1c2a1f]"
                    >
                      <input
                        type="checkbox"
                        name="secoesBloqueadas"
                        value={s.href}
                        defaultChecked={perfil?.secoes_bloqueadas?.includes(
                          s.href
                        )}
                      />
                      {s.icone} {s.label}
                    </label>
                  ))}
              </div>
            </details>
          </div>
        )}
      </section>

      {mensagemErro && (
        <div
          role="alert"
          className="rounded-xl bg-[#fbeae6] p-3 text-sm text-[#8a3320]"
        >
          {mensagemErro}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-[#1f6f3e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-60"
        >
          {salvando
            ? "Salvando..."
            : colaborador?.id
            ? "Salvar alterações"
            : "Cadastrar colaborador"}
        </button>
        <Link
          href="/painel/funcionarios"
          className="text-sm font-medium text-[#5b6b5c] hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
