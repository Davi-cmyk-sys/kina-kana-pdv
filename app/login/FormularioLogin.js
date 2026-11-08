"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { entrar } from "./actions";

// text-base (16px) evita que o iPhone dê zoom na tela ao tocar no campo.
const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] bg-white px-3 py-2.5 text-base text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default function FormularioLogin({ usuarios, erroInicial }) {
  const [estado, acaoEntrar, entrando] = useActionState(entrar, {
    erro: erroInicial ?? null,
  });
  const [usuarioId, setUsuarioId] = useState("");
  const [aviso, setAviso] = useState(null);
  const seletorRef = useRef(null);
  const senhaRef = useRef(null);

  // Depois de uma tentativa com senha errada, o nome continua escolhido, a
  // senha é apagada e o cursor volta para ela.
  useEffect(() => {
    if (estado?.erro && usuarioId && senhaRef.current) {
      senhaRef.current.value = "";
      senhaRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  function aoEscolher(evento) {
    setUsuarioId(evento.target.value);
    setAviso(null);
    if (evento.target.value) {
      senhaRef.current?.focus();
    }
  }

  // O envio é feito aqui (e não com <form action>) porque o React apaga a
  // escolha da lista depois de cada tentativa quando usa <form action>, e a
  // pessoa teria que escolher o nome de novo a cada senha errada.
  function aoEnviar(evento) {
    evento.preventDefault();
    if (!usuarioId) {
      setAviso("Escolha o seu nome na lista.");
      seletorRef.current?.focus();
      return;
    }
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acaoEntrar(dados));
  }

  const mensagemErro = aviso ?? estado?.erro;

  return (
    <form onSubmit={aoEnviar} className="mt-6 space-y-4">
      {mensagemErro && (
        <div
          role="alert"
          className="rounded-xl bg-[#fbeae6] p-3 text-sm text-[#8a3320]"
        >
          {mensagemErro}
        </div>
      )}

      <div>
        <label
          htmlFor="usuario"
          className="block text-sm font-medium text-[#1c2a1f]"
        >
          Nome
        </label>
        <div className="relative">
          <select
            ref={seletorRef}
            id="usuario"
            name="usuario"
            value={usuarioId}
            onChange={aoEscolher}
            className={`${campoClasse} appearance-none pr-10 ${
              usuarioId ? "" : "text-[#8b968a]"
            }`}
          >
            <option value="">— selecione —</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id} className="text-[#1c2a1f]">
                {u.nome}
              </option>
            ))}
          </select>
          {/* Setinhas de "abrir lista", no lugar da seta padrão do navegador */}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-3 top-1/2 mt-0.5 h-5 w-5 -translate-y-1/2 text-[#5b6b5c]"
          >
            <path d="M6 8l4-4 4 4M6 12l4 4 4-4" />
          </svg>
        </div>
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
        className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-60"
      >
        {entrando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
