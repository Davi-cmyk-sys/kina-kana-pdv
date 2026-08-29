"use client";

import { useMemo, useState, useTransition } from "react";
import { criarPedido } from "./actions";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function NovoPedido({ categorias, produtos }) {
  const [categoriaAtiva, setCategoriaAtiva] = useState(
    categorias[0]?.id ?? null
  );
  const [carrinho, setCarrinho] = useState([]);
  const [mensagem, setMensagem] = useState(null);
  const [pending, startTransition] = useTransition();

  const produtosDaCategoria = useMemo(
    () => produtos.filter((p) => p.categoria_id === categoriaAtiva),
    [produtos, categoriaAtiva]
  );

  function adicionar(produto) {
    setMensagem(null);
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produtoId === produto.id);
      if (existente) {
        return atual.map((i) =>
          i.produtoId === produto.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        );
      }
      return [
        ...atual,
        {
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
        },
      ];
    });
  }

  function alterarQuantidade(produtoId, delta) {
    setCarrinho((atual) =>
      atual
        .map((i) =>
          i.produtoId === produtoId
            ? { ...i, quantidade: i.quantidade + delta }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }

  const total = carrinho.reduce(
    (soma, i) => soma + i.preco * i.quantidade,
    0
  );

  function finalizar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await criarPedido({ itens: carrinho });
      if (resultado?.erro) {
        setMensagem({ tipo: "erro", texto: resultado.erro });
      } else {
        setMensagem({
          tipo: "sucesso",
          texto: `Pedido nº ${resultado.numeroSenha} aberto com sucesso!`,
        });
        setCarrinho([]);
      }
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Categorias e produtos */}
      <div>
        {!categorias.length ? (
          <p className="rounded-xl border border-[#dcdfd2] bg-white p-4 text-sm text-[#8b968a]">
            Nenhuma categoria cadastrada ainda. Cadastre o cardápio primeiro
            em "Cardápio (categorias e produtos)".
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(c.id)}
                  className={
                    "rounded-full px-4 py-2 text-sm font-semibold transition " +
                    (categoriaAtiva === c.id
                      ? "bg-[#1f6f3e] text-white"
                      : "bg-white text-[#1c2a1f] border border-[#dcdfd2] hover:bg-[#f6f4ee]")
                  }
                >
                  {c.icone ? `${c.icone} ` : ""}
                  {c.nome}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {!produtosDaCategoria.length ? (
                <p className="col-span-full text-sm text-[#8b968a]">
                  Nenhum produto nessa categoria.
                </p>
              ) : (
                produtosDaCategoria.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => adicionar(produto)}
                    className="flex flex-col items-start rounded-xl border border-[#dcdfd2] bg-white p-3 text-left transition hover:border-[#1f6f3e] hover:shadow-sm"
                  >
                    <span className="text-2xl">{produto.imagem || "🍽️"}</span>
                    <span className="mt-2 text-sm font-semibold text-[#1c2a1f]">
                      {produto.nome}
                    </span>
                    <span className="mt-1 text-sm font-bold text-[#1f6f3e]">
                      {formatoMoeda.format(produto.preco)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Carrinho */}
      <div className="h-fit rounded-2xl border border-[#dcdfd2] bg-white p-4 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1c2a1f]">
          Pedido atual
        </h2>

        {mensagem && (
          <div
            className={
              "mt-3 rounded-lg p-3 text-sm " +
              (mensagem.tipo === "erro"
                ? "bg-[#fbeae6] text-[#8a3320]"
                : "bg-[#e7f2ea] text-[#1f6f3e]")
            }
          >
            {mensagem.texto}
          </div>
        )}

        {!carrinho.length ? (
          <p className="mt-3 text-sm text-[#8b968a]">
            Clique em um produto para adicionar aqui.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {carrinho.map((item) => (
              <div
                key={item.produtoId}
                className="flex items-center justify-between gap-2 border-b border-[#eceae0] pb-2 text-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold text-[#1c2a1f]">{item.nome}</p>
                  <p className="text-xs text-[#8b968a]">
                    {formatoMoeda.format(item.preco)} cada
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(item.produtoId, -1)}
                    className="h-6 w-6 rounded-full border border-[#dcdfd2] text-[#1c2a1f] hover:bg-[#f6f4ee]"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-semibold">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(item.produtoId, 1)}
                    className="h-6 w-6 rounded-full border border-[#dcdfd2] text-[#1c2a1f] hover:bg-[#f6f4ee]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-base font-bold text-[#1c2a1f]">
          <span>Total</span>
          <span>{formatoMoeda.format(total)}</span>
        </div>

        <button
          type="button"
          disabled={!carrinho.length || pending}
          onClick={finalizar}
          className="mt-4 w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Abrindo pedido..." : "Abrir pedido"}
        </button>
      </div>
    </div>
  );
}
