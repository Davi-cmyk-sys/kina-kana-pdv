"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECOES_PAINEL } from "@/lib/secoesPainel";

const PAPEIS = [
  { valor: "caixa", rotulo: "Caixa" },
  { valor: "cozinha", rotulo: "Cozinha" },
  { valor: "entregador", rotulo: "Entregador(a)" },
  { valor: "gerente", rotulo: "Gerente" },
  { valor: "admin", rotulo: "Administrador(a)" },
];

const SECOES_PERSONALIZAVEIS = SECOES_PAINEL.filter(
  (s) => s.href !== "/painel/auditoria"
);

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default function NovoFuncionarioForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState("caixa");
  const [secoesBloqueadas, setSecoesBloqueadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  function alternarSecao(href) {
    setSecoesBloqueadas((atual) =>
      atual.includes(href)
        ? atual.filter((h) => h !== href)
        : [...atual, href]
    );
  }

  async function enviar(evento) {
    evento.preventDefault();
    setCarregando(true);
    setErro(null);
    setSucesso(null);

    try {
      const resposta = await fetch("/api/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          senha,
          papel,
          secoesBloqueadas,
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível cadastrar.");
        return;
      }

      setSucesso(`${nome} foi cadastrado(a) com sucesso.`);
      setNome("");
      setEmail("");
      setSenha("");
      setPapel("caixa");
      setSecoesBloqueadas([]);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-4 space-y-4 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4"
    >
      {erro && (
        <div className="rounded-lg bg-[#fbeae6] p-3 text-sm text-[#8a3320]">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg bg-[#e7f2ea] p-3 text-sm text-[#1f6f3e]">
          {sucesso}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#1c2a1f]">
            Nome
          </label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={campoClasse}
            placeholder="Ex: Maria Silva"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1c2a1f]">
            Papel
          </label>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className={campoClasse}
          >
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1c2a1f]">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={campoClasse}
            placeholder="funcionario@kinakana.com.br"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1c2a1f]">
            Senha inicial
          </label>
          <input
            type="text"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={campoClasse}
            placeholder="mínimo 6 caracteres"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#dcdfd2] bg-white p-3">
        <p className="text-sm font-medium text-[#1c2a1f]">
          Marque as telas que essa pessoa NÃO vai poder acessar
        </p>
        <p className="mt-1 text-xs text-[#8b968a]">
          Deixe tudo desmarcado para usar o acesso normal do papel escolhido
          acima. Marque, por exemplo, "Relatórios" para esconder o lucro da
          loja dessa pessoa.
        </p>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
          {SECOES_PERSONALIZAVEIS.map((s) => (
            <label
              key={s.href}
              className="flex items-center gap-1.5 text-xs text-[#1c2a1f]"
            >
              <input
                type="checkbox"
                checked={secoesBloqueadas.includes(s.href)}
                onChange={() => alternarSecao(s.href)}
              />
              {s.icone} {s.label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-60 sm:w-auto"
      >
        {carregando ? "Cadastrando..." : "Cadastrar funcionário"}
      </button>
    </form>
  );
}
