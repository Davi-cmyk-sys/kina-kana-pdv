"use client";

import { useMemo, useState, useTransition } from "react";
import { criarPedido } from "./actions";
import { formatarRecibo, imprimirLinhas } from "@/lib/impressora";
import { FORMAS_PAGAMENTO } from "@/lib/formasPagamento";
import { normalizarNome } from "@/lib/nomes";

function reciboEmTexto(linhas) {
  return linhas.map((l) => l.texto).join("\n");
}

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

function temFotoReal(imagem) {
  return typeof imagem === "string" && imagem.startsWith("http");
}

// Foto grande no topo do cartão do produto/combo; sem foto, mostra o emoji
// no mesmo tamanho para os cartões ficarem alinhados.
function FotoDoCartao({ imagem, nome, emojiPadrao }) {
  if (temFotoReal(imagem)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imagem}
        alt={nome}
        className="aspect-[4/3] w-full rounded-lg object-cover"
      />
    );
  }
  return (
    <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-[#f6f4ee] text-5xl">
      {imagem || emojiPadrao}
    </span>
  );
}

function subtotalDoItem(item) {
  const totalAdicionais = item.adicionaisSelecionados.reduce(
    (soma, a) => soma + a.preco,
    0
  );
  return item.preco * item.quantidade + totalAdicionais;
}

export default function NovoPedido({ categorias, produtos, combos, adicionais }) {
  const abas = useMemo(() => {
    const listaAbas = categorias.map((c) => ({
      chave: String(c.id),
      rotulo: `${c.icone ? c.icone + " " : ""}${c.nome}`,
    }));
    if (combos.length) {
      listaAbas.push({ chave: "combos", rotulo: "🍱 Combos" });
    }
    return listaAbas;
  }, [categorias, combos]);

  const [abaAtiva, setAbaAtiva] = useState(abas[0]?.chave ?? null);
  const [carrinho, setCarrinho] = useState([]);
  const [resolvendoCombo, setResolvendoCombo] = useState(null); // { combo, respostas }
  const [mensagem, setMensagem] = useState(null);
  const [pending, startTransition] = useTransition();
  const [ultimoRecibo, setUltimoRecibo] = useState(null);
  const [imprimindo, setImprimindo] = useState(false);

  // ---------- desconto ----------
  // Agora é livre: qualquer vendedor aplica direto, sem senha de
  // gerente. O master recebe um aviso sempre que um pedido sai com
  // desconto (ver app/painel/pedido/actions.js).
  const [descontoValorTexto, setDescontoValorTexto] = useState("");
  const [descontoMotivo, setDescontoMotivo] = useState("");
  const [descontoAplicado, setDescontoAplicado] = useState(null); // {valor, motivo}
  const [erroDesconto, setErroDesconto] = useState(null);

  // ---------- pagamento ----------
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [recebidoTexto, setRecebidoTexto] = useState("");

  // ---------- busca por código ou nome ----------
  const [busca, setBusca] = useState("");
  const termoBusca = normalizarNome(busca);
  const resultadosBusca = useMemo(() => {
    if (!termoBusca) return [];
    return produtos.filter(
      (p) =>
        (p.codigo ?? "").toLowerCase().startsWith(termoBusca) ||
        normalizarNome(p.nome).includes(termoBusca)
    );
  }, [produtos, termoBusca]);

  function aoTeclarNaBusca(evento) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    // Código exato (ex: 0002) ou um único resultado: já põe no carrinho.
    const exato = produtos.find(
      (p) => (p.codigo ?? "").toLowerCase() === termoBusca
    );
    const escolhido =
      exato ?? (resultadosBusca.length === 1 ? resultadosBusca[0] : null);
    if (escolhido) {
      adicionarProduto(escolhido);
      setBusca("");
    }
  }

  const produtosDaCategoria = useMemo(
    () =>
      abaAtiva && abaAtiva !== "combos"
        ? produtos.filter((p) => p.categoria_id === Number(abaAtiva))
        : [],
    [produtos, abaAtiva]
  );

  const produtosNaTela = termoBusca ? resultadosBusca : produtosDaCategoria;

  function adicionarProduto(produto) {
    setMensagem(null);
    const chave = `produto-${produto.id}`;
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.chave === chave);
      if (existente) {
        return atual.map((i) =>
          i.chave === chave ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [
        ...atual,
        {
          chave,
          tipo: "produto",
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          adicionaisSelecionados: [],
        },
      ];
    });
  }

  function clicarCombo(combo) {
    setMensagem(null);
    const precisaEscolha = combo.itens.some((i) => i.categoriaId);
    if (!precisaEscolha) {
      adicionarComboAoCarrinho(combo, []);
      return;
    }
    setResolvendoCombo({ combo, respostas: {} });
  }

  function adicionarComboAoCarrinho(combo, escolhas) {
    setCarrinho((atual) => [
      ...atual,
      {
        chave: `combo-${combo.id}-${Date.now()}-${Math.random()}`,
        tipo: "combo",
        comboId: combo.id,
        nome: combo.nome,
        preco: combo.preco,
        quantidade: 1,
        adicionaisSelecionados: [],
        escolhas,
      },
    ]);
  }

  function confirmarEscolhasCombo() {
    const { combo, respostas } = resolvendoCombo;
    const escolhas = combo.itens
      .filter((i) => i.categoriaId)
      .map((i) => {
        const produtoId = Number(respostas[i.id]);
        const produto = produtos.find((p) => p.id === produtoId);
        return {
          itemComboId: i.id,
          categoriaId: i.categoriaId,
          categoriaNome: i.categoriaNome,
          produtoId,
          produtoNome: produto?.nome ?? null,
        };
      });
    adicionarComboAoCarrinho(combo, escolhas);
    setResolvendoCombo(null);
  }

  const faltamEscolhas =
    resolvendoCombo &&
    resolvendoCombo.combo.itens
      .filter((i) => i.categoriaId)
      .some((i) => !resolvendoCombo.respostas[i.id]);

  function alterarQuantidade(chave, delta) {
    setCarrinho((atual) =>
      atual
        .map((i) =>
          i.chave === chave ? { ...i, quantidade: i.quantidade + delta } : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }

  function alternarAdicional(chave, adicional) {
    setCarrinho((atual) =>
      atual.map((i) => {
        if (i.chave !== chave) return i;
        const jaTem = i.adicionaisSelecionados.some(
          (a) => a.id === adicional.id
        );
        return {
          ...i,
          adicionaisSelecionados: jaTem
            ? i.adicionaisSelecionados.filter((a) => a.id !== adicional.id)
            : [
                ...i.adicionaisSelecionados,
                {
                  id: adicional.id,
                  nome: adicional.nome,
                  preco: adicional.preco,
                },
              ],
        };
      })
    );
  }

  const subtotalGeral = carrinho.reduce(
    (soma, item) => soma + subtotalDoItem(item),
    0
  );
  const total = Math.max(subtotalGeral - (descontoAplicado?.valor ?? 0), 0);

  function aplicarDesconto() {
    setErroDesconto(null);
    const valor = Number(descontoValorTexto.replace(",", "."));
    if (!valor || valor <= 0) {
      setErroDesconto("Digite um valor de desconto maior que zero.");
      return;
    }
    if (valor > subtotalGeral) {
      setErroDesconto("O desconto não pode ser maior que o subtotal.");
      return;
    }
    setDescontoAplicado({ valor, motivo: descontoMotivo });
  }

  function removerDesconto() {
    setDescontoAplicado(null);
    setDescontoValorTexto("");
    setDescontoMotivo("");
    setErroDesconto(null);
  }

  const recebido = Number(recebidoTexto.replace(",", "."));
  const trocoPrevisto =
    formaPagamento === "dinheiro" && recebido > total ? recebido - total : 0;

  function finalizar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await criarPedido({
        itens: carrinho,
        desconto: descontoAplicado,
        pagamento: { forma: formaPagamento, recebido: recebidoTexto || null },
      });
      if (resultado?.erro) {
        setMensagem({ tipo: "erro", texto: resultado.erro });
      } else {
        setMensagem({
          tipo: "sucesso",
          texto:
            `Pedido nº ${resultado.numeroSenha} pago com sucesso!` +
            (resultado.troco > 0
              ? ` Troco: ${formatoMoeda.format(resultado.troco)}`
              : ""),
        });
        setUltimoRecibo({
          numeroSenha: resultado.numeroSenha,
          dataHora: new Date().toISOString(),
          itens: carrinho.map((item) => ({
            nome: item.nome,
            quantidade: item.quantidade,
            precoTotal: item.preco * item.quantidade,
            escolhas: item.escolhas?.map((e) => e.produtoNome).filter(Boolean),
            adicionais: item.adicionaisSelecionados,
          })),
          subtotal: subtotalGeral,
          desconto: descontoAplicado?.valor ?? 0,
          total,
          formaPagamento,
          troco: resultado.troco ?? 0,
        });
        setCarrinho([]);
        removerDesconto();
        setRecebidoTexto("");
      }
    });
  }

  async function imprimirComprovante() {
    if (!ultimoRecibo) return;
    setImprimindo(true);
    try {
      await imprimirLinhas(formatarRecibo(ultimoRecibo));
      setMensagem({ tipo: "sucesso", texto: "Comprovante enviado para a impressora." });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: "Erro ao imprimir: " + (err?.message ?? String(err)),
      });
    } finally {
      setImprimindo(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Categorias, produtos e combos */}
      <div>
        {!abas.length ? (
          <p className="rounded-xl border border-[#dcdfd2] bg-white p-4 text-sm text-[#8b968a]">
            Nenhuma categoria cadastrada ainda. Cadastre o cardápio primeiro
            em "Cardápio (categorias e produtos)".
          </p>
        ) : (
          <>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={aoTeclarNaBusca}
              className="mb-3 w-full rounded-lg border border-[#dcdfd2] bg-white px-3 py-2.5 text-base text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
              placeholder="Buscar por código ou nome (ex: 0002) e Enter"
              aria-label="Buscar produto por código ou nome"
            />
            <div className="flex flex-wrap gap-2">
              {abas.map((aba) => (
                <button
                  key={aba.chave}
                  type="button"
                  onClick={() => {
                    setAbaAtiva(aba.chave);
                    setBusca("");
                  }}
                  className={
                    "rounded-full px-4 py-2 text-sm font-semibold transition " +
                    (abaAtiva === aba.chave
                      ? "bg-[#1f6f3e] text-white"
                      : "bg-white text-[#1c2a1f] border border-[#dcdfd2] hover:bg-[#f6f4ee]")
                  }
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>

            {abaAtiva === "combos" && !termoBusca ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {combos.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => clicarCombo(combo)}
                    className="flex flex-col items-start rounded-xl border border-[#dcdfd2] bg-white p-3 text-left transition hover:border-[#1f6f3e] hover:shadow-sm"
                  >
                    <FotoDoCartao
                      imagem={combo.imagem}
                      nome={combo.nome}
                      emojiPadrao="🍱"
                    />
                    <span className="mt-2 text-base font-bold leading-tight text-[#1c2a1f]">
                      {combo.nome}
                    </span>
                    <span className="mt-1 text-base font-bold text-[#1f6f3e]">
                      {formatoMoeda.format(combo.preco)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {!produtosNaTela.length ? (
                  <p className="col-span-full text-sm text-[#8b968a]">
                    {termoBusca
                      ? "Nenhum produto com esse código ou nome."
                      : "Nenhum produto nessa categoria."}
                  </p>
                ) : (
                  produtosNaTela.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => adicionarProduto(produto)}
                      className="flex flex-col items-start rounded-xl border border-[#dcdfd2] bg-white p-3 text-left transition hover:border-[#1f6f3e] hover:shadow-sm"
                    >
                      <FotoDoCartao
                        imagem={produto.imagem}
                        nome={produto.nome}
                        emojiPadrao="🍽️"
                      />
                      <span className="mt-2 font-mono text-xs font-semibold text-[#5b6b5c]">
                        {produto.codigo}
                      </span>
                      <span className="text-base font-bold leading-tight text-[#1c2a1f]">
                        {produto.nome}
                      </span>
                      {produto.descricao && (
                        <span className="mt-0.5 text-sm leading-tight text-[#5b6b5c]">
                          {produto.descricao}
                        </span>
                      )}
                      <span className="mt-1 text-base font-bold text-[#1f6f3e]">
                        {formatoMoeda.format(produto.preco)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Resolver escolhas de um combo */}
            {resolvendoCombo && (
              <div className="mt-4 rounded-xl border-2 border-[#1f6f3e] bg-[#f6f4ee] p-4">
                <p className="text-sm font-bold text-[#1c2a1f]">
                  Escolhas do combo "{resolvendoCombo.combo.nome}"
                </p>
                <div className="mt-2 space-y-2">
                  {resolvendoCombo.combo.itens
                    .filter((i) => i.categoriaId)
                    .map((item) => (
                      <div key={item.id}>
                        <label className="block text-xs font-medium text-[#1c2a1f]">
                          {item.rotulo ||
                            `Escolha em "${item.categoriaIcone ? item.categoriaIcone + " " : ""}${item.categoriaNome}"`}
                        </label>
                        <select
                          className={campoClasse}
                          value={resolvendoCombo.respostas[item.id] ?? ""}
                          onChange={(e) =>
                            setResolvendoCombo((atual) => ({
                              ...atual,
                              respostas: {
                                ...atual.respostas,
                                [item.id]: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          {produtos
                            .filter((p) => p.categoria_id === item.categoriaId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={faltamEscolhas}
                    onClick={confirmarEscolhasCombo}
                    className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar ao carrinho
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolvendoCombo(null)}
                    className="rounded-lg border border-[#dcdfd2] px-4 py-2 text-sm font-semibold text-[#1c2a1f] hover:bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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
            {mensagem.tipo === "sucesso" && ultimoRecibo && (
              <div className="mt-2 space-y-2">
                <details className="rounded-lg border border-[#1f6f3e]/30 bg-white">
                  <summary className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-[#1f6f3e]">
                    Ver recibo
                  </summary>
                  <pre className="whitespace-pre-wrap px-3 pb-3 text-xs text-[#1c2a1f]">
                    {reciboEmTexto(formatarRecibo(ultimoRecibo))}
                  </pre>
                </details>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={imprimindo}
                    onClick={imprimirComprovante}
                    className="rounded-lg border border-[#1f6f3e] bg-white px-2 py-1.5 text-xs font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee] disabled:opacity-50"
                  >
                    {imprimindo ? "Imprimindo..." : "🖨️ Imprimir"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      reciboEmTexto(formatarRecibo(ultimoRecibo))
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#1f6f3e] bg-white px-2 py-1.5 text-center text-xs font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
                  >
                    📲 WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Recibo — Pedido nº ${ultimoRecibo.numeroSenha}`
                    )}&body=${encodeURIComponent(
                      reciboEmTexto(formatarRecibo(ultimoRecibo))
                    )}`}
                    className="rounded-lg border border-[#1f6f3e] bg-white px-2 py-1.5 text-center text-xs font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
                  >
                    ✉️ E-mail
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {!carrinho.length ? (
          <p className="mt-3 text-sm text-[#8b968a]">
            Clique em um produto ou combo para adicionar aqui.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {carrinho.map((item) => (
              <div
                key={item.chave}
                className="border-b border-[#eceae0] pb-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-bold text-[#1c2a1f]">
                      {item.nome}
                    </p>
                    {item.escolhas?.length > 0 && (
                      <p className="text-xs text-[#8b968a]">
                        {item.escolhas.map((e) => e.produtoNome).join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-[#8b968a]">
                      {formatoMoeda.format(item.preco)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.chave, -1)}
                      className="h-7 w-7 rounded-full border border-[#dcdfd2] text-base text-[#1c2a1f] hover:bg-[#f6f4ee]"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-base font-bold text-[#1c2a1f]">
                      {item.quantidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.chave, 1)}
                      className="h-7 w-7 rounded-full border border-[#dcdfd2] text-base text-[#1c2a1f] hover:bg-[#f6f4ee]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {adicionais.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {adicionais.map((a) => {
                      const selecionado = item.adicionaisSelecionados.some(
                        (x) => x.id === a.id
                      );
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => alternarAdicional(item.chave, a)}
                          className={
                            "rounded-full border px-2 py-0.5 text-xs transition " +
                            (selecionado
                              ? "border-[#1f6f3e] bg-[#e7f2ea] text-[#1f6f3e] font-semibold"
                              : "border-[#dcdfd2] text-[#5b6b5c] hover:bg-[#f6f4ee]")
                          }
                        >
                          {a.nome} +{formatoMoeda.format(a.preco)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Desconto — livre, sem senha de gerente. O master é avisado
            depois de qualquer pedido com desconto. */}
        <details className="mt-4 rounded-lg border border-[#dcdfd2] p-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#1c2a1f]">
            Desconto {descontoAplicado ? "✓ aplicado" : ""}
          </summary>

          {descontoAplicado ? (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[#1f6f3e]">
                Desconto de {formatoMoeda.format(descontoAplicado.valor)}{" "}
                aplicado.
                {descontoAplicado.motivo ? ` Motivo: ${descontoAplicado.motivo}.` : ""}
              </p>
              <button
                type="button"
                onClick={removerDesconto}
                className="text-xs font-medium text-[#b3432f] hover:underline"
              >
                Remover desconto
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {erroDesconto && (
                <div className="rounded-lg bg-[#fbeae6] p-2 text-xs text-[#8a3320]">
                  {erroDesconto}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#1c2a1f]">
                  Valor do desconto (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={descontoValorTexto}
                  onChange={(e) => setDescontoValorTexto(e.target.value)}
                  className={campoClasse}
                  placeholder="5,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1c2a1f]">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={descontoMotivo}
                  onChange={(e) => setDescontoMotivo(e.target.value)}
                  className={campoClasse}
                  placeholder="Ex: cliente fidelidade"
                />
              </div>
              <p className="text-xs text-[#8b968a]">
                O master recebe um aviso de todo pedido com desconto.
              </p>
              <button
                type="button"
                onClick={aplicarDesconto}
                className="w-full rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
              >
                Aplicar desconto
              </button>
            </div>
          )}
        </details>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex items-center justify-between text-[#5b6b5c]">
            <span>Subtotal</span>
            <span>{formatoMoeda.format(subtotalGeral)}</span>
          </div>
          {descontoAplicado && (
            <div className="flex items-center justify-between text-[#b3432f]">
              <span>Desconto</span>
              <span>− {formatoMoeda.format(descontoAplicado.valor)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg font-bold text-[#1c2a1f]">
            <span>Total</span>
            <span>{formatoMoeda.format(total)}</span>
          </div>
        </div>

        {/* Pagamento */}
        <div className="mt-4 rounded-lg border border-[#dcdfd2] p-3">
          <p className="text-xs font-semibold text-[#1c2a1f]">
            Forma de pagamento
          </p>
          <div
            role="radiogroup"
            aria-label="Forma de pagamento"
            className="mt-2 grid gap-1.5"
          >
            {FORMAS_PAGAMENTO.map((f) => {
              const ativa = formaPagamento === f.valor;
              return (
                <button
                  key={f.valor}
                  type="button"
                  role="radio"
                  aria-checked={ativa}
                  onClick={() => setFormaPagamento(f.valor)}
                  className={
                    "rounded-lg border px-3 py-2 text-left text-sm font-semibold transition " +
                    (ativa
                      ? "border-[#1f6f3e] bg-[#1f6f3e] text-white"
                      : "border-[#dcdfd2] bg-white text-[#1c2a1f] hover:bg-[#f6f4ee]")
                  }
                >
                  {f.rotulo}
                </button>
              );
            })}
          </div>

          {formaPagamento === "dinheiro" && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-[#1c2a1f]">
                Valor recebido (opcional, pra calcular o troco)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={recebidoTexto}
                onChange={(e) => setRecebidoTexto(e.target.value)}
                className={campoClasse}
                placeholder={formatoMoeda.format(total)}
              />
              {trocoPrevisto > 0 && (
                <p className="mt-1 text-xs font-semibold text-[#1f6f3e]">
                  Troco: {formatoMoeda.format(trocoPrevisto)}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!carrinho.length || pending}
          onClick={finalizar}
          className="mt-4 w-full rounded-lg bg-[#1f6f3e] px-4 py-3 text-lg font-bold text-white transition hover:bg-[#195c33] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Finalizando..."
            : `Finalizar pedido — ${formatoMoeda.format(total)}`}
        </button>
      </div>
    </div>
  );
}
