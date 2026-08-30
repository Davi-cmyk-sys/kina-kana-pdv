"use client";

import { useEffect, useState } from "react";
import {
  navegadorSuportaBluetooth,
  impressoraConectada,
  nomeImpressoraSalva,
  parearImpressora,
  imprimirTeste,
} from "@/lib/impressora";

export default function ConfiguracaoImpressora() {
  const [suportado, setSuportado] = useState(true);
  const [conectada, setConectada] = useState(false);
  const [nomeSalvo, setNomeSalvo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    setSuportado(navegadorSuportaBluetooth());
    setConectada(impressoraConectada());
    setNomeSalvo(nomeImpressoraSalva());
  }, []);

  async function parear() {
    setMensagem(null);
    setCarregando(true);
    try {
      const nome = await parearImpressora();
      setConectada(true);
      setNomeSalvo(nome);
      setMensagem({
        tipo: "sucesso",
        texto: `Pareado com "${nome}". Clique em "Testar impressão" para conferir.`,
      });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto:
          err?.name === "NotFoundError"
            ? "Nenhuma impressora selecionada, ou nenhum aparelho compatível encontrado por perto."
            : "Erro ao parear: " + (err?.message ?? String(err)),
      });
    } finally {
      setCarregando(false);
    }
  }

  async function testar() {
    setMensagem(null);
    setCarregando(true);
    try {
      await imprimirTeste();
      setMensagem({ tipo: "sucesso", texto: "Comprovante de teste enviado!" });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: "Erro ao imprimir: " + (err?.message ?? String(err)),
      });
    } finally {
      setCarregando(false);
    }
  }

  if (!suportado) {
    return (
      <div className="mt-6 rounded-xl bg-[#fbeae6] p-4 text-sm text-[#8a3320]">
        Esse navegador não tem suporte a impressão Bluetooth (Web
        Bluetooth). Use o <strong>Chrome</strong> ou o <strong>Edge</strong>{" "}
        no computador, tablet ou celular Android. Não funciona no Safari
        (iPhone/iPad).
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {mensagem && (
        <div
          className={
            "rounded-lg p-3 text-sm " +
            (mensagem.tipo === "erro"
              ? "bg-[#fbeae6] text-[#8a3320]"
              : "bg-[#e7f2ea] text-[#1f6f3e]")
          }
        >
          {mensagem.texto}
        </div>
      )}

      <div className="rounded-xl border border-[#dcdfd2] p-4">
        <p className="text-sm font-semibold text-[#1c2a1f]">
          Status: {conectada ? "✓ conectada" : "sem conexão"}
        </p>
        {nomeSalvo && (
          <p className="mt-1 text-xs text-[#8b968a]">
            Última impressora pareada neste navegador:{" "}
            <strong>{nomeSalvo}</strong>
            {!conectada && " (é preciso parear de novo depois de recarregar a página)"}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={carregando}
            onClick={parear}
            className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-50"
          >
            {carregando ? "Aguarde..." : "Parear impressora"}
          </button>
          <button
            type="button"
            disabled={carregando || !conectada}
            onClick={testar}
            className="rounded-lg border border-[#1f6f3e] px-4 py-2 text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Testar impressão
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4 text-sm text-[#5b6b5c]">
        <p className="font-semibold text-[#1c2a1f]">Como parear</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Ligue a impressora térmica e deixe ela perto do computador.</li>
          <li>
            Clique em <strong>"Parear impressora"</strong> acima — o
            navegador vai abrir uma lista de aparelhos Bluetooth por perto.
          </li>
          <li>Escolha a impressora na lista e confirme.</li>
          <li>
            Clique em <strong>"Testar impressão"</strong> para conferir se
            saiu um comprovante de teste.
          </li>
        </ol>
        <p className="mt-3 text-xs text-[#8b968a]">
          O pareamento é lembrado só neste navegador/computador. Cada
          caixa/computador que for imprimir precisa parear a própria
          impressora aqui uma vez. Depois de fechar e reabrir o navegador,
          pode ser preciso parear de novo — isso é uma limitação do
          Bluetooth do navegador, não um problema do sistema.
        </p>
      </div>
    </div>
  );
}
