"use client";

import { useState } from "react";

// Marcas finas, cantos de 4px na ponta dos dados, 2px de espaço branco
// entre partes que se tocam, grade bem clara. O texto nunca usa a cor do
// dado (fica nas cores de texto).
import { COR, formatarMoeda } from "./formato";

const numero = new Intl.NumberFormat("pt-BR");

function moedaCurta(v) {
  if (Math.abs(v) >= 1000) {
    return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

// Teto "redondo" do eixo com 4 faixas (0, ¼, ½, ¾, topo), o mais justo
// possível. Em eixo de contagem, só marcas inteiras.
function escala(maximo, inteiro = false) {
  if (!(maximo > 0)) return { topo: 1, marcas: [0] };
  const passoBruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(passoBruto));
  const multiplos = [1, 2, 2.5, 5, 10];
  let passo = multiplos.find((m) => m * potencia >= passoBruto) * potencia;
  if (inteiro) passo = Math.max(1, Math.ceil(passo));
  return { topo: passo * 4, marcas: [0, 1, 2, 3, 4].map((i) => i * passo) };
}

function Dica({ ativo, posicao, children }) {
  if (!ativo) return null;
  // Perto das bordas, a dica se alinha para dentro (não sai da tela).
  const deslocamento =
    posicao < 0.2 ? "-15%" : posicao > 0.8 ? "-85%" : "-50%";
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full z-20 mb-2 min-w-[150px] rounded-lg border border-[#dcdfd2] bg-white px-3 py-2 text-left text-xs shadow-lg"
      style={{ left: `${posicao * 100}%`, transform: `translateX(${deslocamento})` }}
    >
      {children}
    </div>
  );
}

function LinhaDica({ cor, rotulo, valor, forte = true }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="flex items-center gap-1.5 text-[#5b6b5c]">
        {cor && (
          <span
            aria-hidden="true"
            className="inline-block h-[2px] w-3 rounded-full"
            style={{ background: cor }}
          />
        )}
        {rotulo}
      </span>
      <span className={forte ? "font-semibold text-[#1c2a1f]" : "text-[#1c2a1f]"}>
        {valor}
      </span>
    </div>
  );
}

export function Legenda({ itens }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5b6b5c]">
      {itens.map((i) => (
        <span key={i.nome} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ background: i.cor }}
          />
          {i.nome}
        </span>
      ))}
    </div>
  );
}

// Colunas empilhadas (ex.: lucro embaixo, custo em cima = faturamento).
// pontos: [{ chave, rotulo, rotuloLongo, partes: [{ serie, valor }], detalhes: [{ rotulo, valor }] }]
// series: [{ chave, nome, cor }]
export function GraficoColunas({
  pontos,
  series,
  altura = 180,
  tipoEixo = "moeda",
  rotuloTabela = "Período",
  colunasTabela,
}) {
  const [ativo, setAtivo] = useState(null);
  const formatarEixo =
    tipoEixo === "moeda" ? moedaCurta : (v) => numero.format(v);
  const totais = pontos.map((p) =>
    p.partes.reduce((s, parte) => s + Math.max(parte.valor, 0), 0)
  );
  const { topo, marcas } = escala(Math.max(0, ...totais), tipoEixo !== "moeda");
  const n = pontos.length;
  // No máximo ~10 rótulos no eixo de baixo, para não encavalar.
  const passoRotulo = Math.max(1, Math.ceil(n / 10));

  return (
    <figure>
      <div
        className="relative mt-3 flex"
        // Só o mouse "sai" do gráfico; no toque o celular simula essa saída
        // logo depois de tocar, o que fecharia a dica na hora.
        onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
      >
        {/* Eixo Y */}
        <div
          className="relative mr-2 w-14 shrink-0 text-right text-[10px] tabular-nums text-[#8b968a]"
          style={{ height: altura }}
          aria-hidden="true"
        >
          {marcas.map((m) => (
            <span
              key={m}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: altura - (m / topo) * altura }}
            >
              {formatarEixo(m)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grade */}
          <div className="absolute inset-x-0 top-0" style={{ height: altura }} aria-hidden="true">
            {marcas.map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 h-px"
                style={{ top: altura - (m / topo) * altura, background: COR.grade }}
              />
            ))}
          </div>

          {/* Colunas */}
          <div className="relative flex items-end" style={{ height: altura }}>
            {pontos.map((p, i) => {
              const total = totais[i];
              const alturaTotal = (total / topo) * altura;
              const partesVisiveis = p.partes.filter((parte) => parte.valor > 0);
              return (
                <button
                  key={p.chave}
                  type="button"
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                  // Mouse: dica ao passar por cima. Toque: dica ao tocar
                  // (não alterna, senão o toque abre e fecha na hora).
                  onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  onBlur={() => setAtivo(null)}
                  onClick={() => setAtivo(i)}
                  aria-label={`${p.rotuloLongo}: ${p.detalhes
                    .map((d) => `${d.rotulo} ${d.valor}`)
                    .join(", ")}`}
                >
                  <span
                    className={
                      "flex w-[62%] max-w-[24px] flex-col-reverse gap-[2px] transition-opacity " +
                      (ativo !== null && ativo !== i ? "opacity-50" : "")
                    }
                    style={{ height: Math.max(alturaTotal, total > 0 ? 2 : 0) }}
                  >
                    {partesVisiveis.map((parte, k) => {
                      const serie = series.find((s) => s.chave === parte.serie);
                      const ehTopo = k === partesVisiveis.length - 1;
                      return (
                        <span
                          key={parte.serie}
                          className={ehTopo ? "rounded-t-[4px]" : ""}
                          style={{
                            flexGrow: parte.valor,
                            flexBasis: 0,
                            minHeight: 1,
                            background: serie?.cor,
                          }}
                        />
                      );
                    })}
                  </span>
                  <span className="absolute inset-0 rounded group-focus-visible:ring-2 group-focus-visible:ring-[#1f6f3e]" />
                </button>
              );
            })}
          </div>

          {/* Eixo X */}
          <div className="flex pt-1.5 text-[10px] tabular-nums text-[#8b968a]" aria-hidden="true">
            {pontos.map((p, i) => (
              <span key={p.chave} className="flex-1 truncate text-center">
                {i % passoRotulo === 0 ? p.rotulo : ""}
              </span>
            ))}
          </div>

          {ativo !== null && (
            // Só posiciona a dica: não pode "roubar" toques das colunas.
            <div
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{ height: altura }}
            >
              <div
                className="absolute"
                style={{
                  left: 0,
                  right: 0,
                  top: altura - (totais[ativo] / topo) * altura,
                }}
              >
                <Dica ativo posicao={(ativo + 0.5) / n}>
                  <p className="mb-1 font-semibold text-[#1c2a1f]">
                    {pontos[ativo].rotuloLongo}
                  </p>
                  {pontos[ativo].detalhes.map((d) => (
                    <LinhaDica key={d.rotulo} {...d} />
                  ))}
                </Dica>
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-medium text-[#1f6f3e]">
          Ver em tabela
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#eceae0]">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-[#f6f4ee] text-[#5b6b5c]">
              <tr>
                <th className="px-2 py-1.5 font-medium">{rotuloTabela}</th>
                {colunasTabela.map((c) => (
                  <th key={c} className="px-2 py-1.5 text-right font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.chave} className="border-t border-[#eceae0] text-[#1c2a1f]">
                  <td className="px-2 py-1">{p.rotuloLongo}</td>
                  {p.detalhes.map((d) => (
                    <td key={d.rotulo} className="px-2 py-1 text-right">
                      {d.valor}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// Barras horizontais em ordem (maior primeiro), uma cor só, valor na ponta.
// linhas: [{ chave, nome, valor, rotuloValor, detalhes: [{ rotulo, valor }], aviso }]
export function BarrasRanking({ linhas, cor = COR.destaque, vazio = "Sem vendas no período." }) {
  const [ativo, setAtivo] = useState(null);
  if (!linhas.length) {
    return <p className="mt-3 text-sm text-[#8b968a]">{vazio}</p>;
  }
  const maximo = Math.max(...linhas.map((l) => l.valor), 0) || 1;

  return (
    <ol
      className="mt-3 space-y-1"
      onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
    >
      {linhas.map((l, i) => {
        const largura = Math.max((l.valor / maximo) * 100, l.valor > 0 ? 1.5 : 0);
        return (
          <li key={l.chave} className="relative">
            <button
              type="button"
              className={
                "grid w-full grid-cols-1 items-center gap-x-2 gap-y-0.5 rounded-md px-1 py-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#1f6f3e] sm:grid-cols-[minmax(0,42%)_1fr] " +
                (ativo === i ? "bg-[#f6f4ee]" : "")
              }
              onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              onClick={() => setAtivo(i)}
              aria-label={`${l.nome}: ${l.rotuloValor}. ${(l.detalhes ?? [])
                .map((d) => `${d.rotulo} ${d.valor}`)
                .join(", ")}`}
            >
              <span className="truncate text-xs text-[#1c2a1f]" title={l.nome}>
                <span className="mr-1 text-[#8b968a] tabular-nums">{i + 1}.</span>
                {l.nome}
                {l.aviso && <span className="ml-1 text-[#b08900]">{l.aviso}</span>}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="relative h-3.5 min-w-0 flex-1">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{ width: `${largura * 0.72}%`, background: cor }}
                  />
                  <span
                    className="absolute inset-y-0 whitespace-nowrap pl-1.5 text-[11px] font-semibold leading-[14px] text-[#1c2a1f]"
                    style={{ left: `${largura * 0.72}%` }}
                  >
                    {l.rotuloValor}
                  </span>
                </span>
              </span>
            </button>
            {ativo === i && l.detalhes?.length > 0 && (
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 min-w-[170px] rounded-lg border border-[#dcdfd2] bg-white px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 font-semibold text-[#1c2a1f]">{l.nome}</p>
                {l.detalhes.map((d) => (
                  <LinhaDica key={d.rotulo} rotulo={d.rotulo} valor={d.valor} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Uma barra fina dividida em partes + lista com nome, valor e % ao lado.
// partes: [{ chave, nome, valor, cor }]
export function BarraSegmentada({ partes, formatar = formatarMoeda }) {
  const [ativo, setAtivo] = useState(null);
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const visiveis = partes.filter((p) => p.valor > 0);
  if (!total) {
    return <p className="mt-3 text-sm text-[#8b968a]">Sem pagamentos no período.</p>;
  }
  const pct = (v) =>
    `${((v / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <div className="mt-3">
      <div
        className="flex h-2 w-full gap-[2px]"
        onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
        role="img"
        aria-label={visiveis.map((p) => `${p.nome}: ${formatar(p.valor)} (${pct(p.valor)})`).join("; ")}
      >
        {visiveis.map((p) => (
          <span
            key={p.chave}
            className={
              "h-full rounded-full transition-opacity first:rounded-l-full last:rounded-r-full " +
              (ativo && ativo !== p.chave ? "opacity-40" : "")
            }
            style={{ flexGrow: p.valor, flexBasis: 0, background: p.cor }}
            onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(p.chave)}
          />
        ))}
      </div>
      <ul className="mt-3 divide-y divide-[#eceae0]">
        {partes.map((p) => (
          <li
            key={p.chave}
            className={
              "flex items-center justify-between gap-3 py-1.5 text-sm transition " +
              (ativo === p.chave ? "bg-[#f6f4ee]" : "")
            }
            onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(p.chave)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
          >
            <span className="flex min-w-0 items-center gap-2 text-[#1c2a1f]">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: p.cor }}
              />
              <span className="truncate">{p.nome}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-[#1c2a1f]">{formatar(p.valor)}</span>
              <span className="ml-2 inline-block w-12 text-right text-xs text-[#8b968a]">
                {pct(p.valor)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

