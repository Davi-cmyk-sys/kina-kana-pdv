"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { entrar } from "./actions";
import { normalizarNome } from "@/lib/nomes";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default function FormularioLogin({ usuarios, erroInicial }) {
  const [estado, acaoEntrar, entrando] = useActionState(entrar, {
    erro: erroInicial ?? null,
  });
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const buscaRef = useRef(null);
  const senhaRef = useRef(null);

  const termo = normalizarNome(busca);
  const encontrados = termo
    ? usuarios.filter((u) => normalizarNome(u.nome).includes(termo))
    : [];

  // Depois de uma tentativa com senha errada, volta o cursor para a senha
  // (o usuário escolhido continua selecionado).
  useEffect(() => {
    if (estado?.erro && selecionado) {
      senhaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  function selecionar(usuario) {
    setSelecionado(usuario);
    setBusca("");
    setAviso(null);
    requestAnimationFrame(() => senhaRef.current?.focus());
  }

  function trocarUsuario() {
    setSelecionado(null);
    setAviso(null);
    requestAnimationFrame(() => buscaRef.current?.focus());
  }

  function aoDigitarNaBusca(evento) {
    if (evento.key !== "Enter") return;
    // Enter na busca nunca envia o formulário: se só um nome bate, já
    // seleciona; senão, pede para tocar no nome certo.
    evento.preventDefault();
    if (encontrados.length === 1) {
      selecionar(encontrados[0]);
    } else if (termo) {
      setAviso(
        encontrados.length
          ? "Toque no seu usuário na lista."
          : "Nenhum usuário com esse nome."
      );
    }
  }

  function aoEnviar(evento) {
    if (!selecionado) {
      evento.preventDefault();
      setAviso("Digite seu nome e toque no seu usuário na lista.");
      buscaRef.current?.focus();
    }
  }

  const mensagemErro = aviso ?? estado?.erro;

  return (
    <form action={acaoEntrar} onSubmit={aoEnviar} className="mt-6 space-y-4">
      {mensagemErro && (
        <div
          role="alert"
          className="rounded-xl bg-[#fbeae6] p-3 text-sm text-[#8a3320]"
        >
          {mensagemErro}
        </div>
      )}

      <input type="hidden" name="usuario" value={selecionado?.id ?? ""} />

      <div>
        <label
          htmlFor={selecionado ? undefined : "busca-usuario"}
          className="block text-sm font-medium text-[#1c2a1f]"
        >
          Usuário
        </label>

        {selecionado ? (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-[#1f6f3e] bg-[#e7f2ea] px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-[#1c2a1f]">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f6f3e] text-xs font-bold text-white"
              >
                {selecionado.nome.trim().charAt(0).toUpperCase()}
              </span>
              {selecionado.nome}
            </span>
            <button
              type="button"
              onClick={trocarUsuario}
              className="text-xs font-medium text-[#1f6f3e] hover:underline"
            >
              Trocar
            </button>
          </div>
        ) : (
          <>
            <input
              ref={buscaRef}
              id="busca-usuario"
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAviso(null);
              }}
              onKeyDown={aoDigitarNaBusca}
              autoComplete="off"
              autoCapitalize="words"
              autoFocus
              className={campoClasse}
              placeholder="Digite seu nome"
            />

            {termo && (
              <ul
                aria-label="Usuários encontrados"
                className="mt-2 max-h-56 divide-y divide-[#eceae0] overflow-y-auto rounded-lg border border-[#dcdfd2]"
              >
                {encontrados.length ? (
                  encontrados.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => selecionar(u)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#1c2a1f] transition hover:bg-[#f6f4ee] focus:bg-[#f6f4ee] focus:outline-none"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f6f3e]/10 text-xs font-bold text-[#1f6f3e]"
                        >
                          {u.nome.trim().charAt(0).toUpperCase()}
                        </span>
                        {u.nome}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2.5 text-sm text-[#8b968a]">
                    Nenhum usuário com esse nome.
                  </li>
                )}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="senha"
          className="block text-sm font-medium text-[#1c2a1f]"
        >
          Senha
        </label>
        <input
          ref={senhaRef}
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={campoClasse}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={entrando}
        className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-60"
      >
        {entrando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
