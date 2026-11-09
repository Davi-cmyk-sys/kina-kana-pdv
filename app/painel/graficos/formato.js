// Cores e formatação usadas tanto pelo servidor (página) quanto pelos
// gráficos no navegador.
export const COR = {
  destaque: "#1f6f3e", // verde da marca: a série principal
  apagado: "#c5cbbd", // cinza: o que é contexto (ex.: custo)
  grade: "#eceae0",
  texto: "#1c2a1f",
  textoSecundario: "#5b6b5c",
  textoFraco: "#8b968a",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(v) {
  return moeda.format(v ?? 0);
}
