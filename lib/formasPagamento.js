// Formas de pagamento oferecidas no sistema, NESTA ordem (é a ordem que
// aparece no Novo Pedido, no fechamento de caixa e nos relatórios).
// "coluna" é onde o valor informado no fechamento de caixa é guardado.
export const FORMAS_PAGAMENTO = [
  { valor: "dinheiro", rotulo: "Dinheiro", coluna: "valor_dinheiro" },
  { valor: "pix_maquineta", rotulo: "Pix maquineta", coluna: "valor_pix_maquineta" },
  { valor: "credito", rotulo: "Cartão de crédito 1X", coluna: "valor_credito" },
  { valor: "debito", rotulo: "Cartão de débito", coluna: "valor_debito" },
  { valor: "pix_conta", rotulo: "Pix direto na conta", coluna: "valor_pix_conta" },
];

export const FORMAS_VALIDAS = FORMAS_PAGAMENTO.map((f) => f.valor);

// Formas que não são mais oferecidas, mas aparecem em pedidos antigos.
const ROTULOS_ANTIGOS = {
  pix: "Pix",
  vale_refeicao: "Vale-refeição",
  vale_alimentacao: "Vale-alimentação",
  outros: "Outros",
};

const ROTULOS = {
  ...Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f.valor, f.rotulo])),
  ...ROTULOS_ANTIGOS,
};

export function nomeDaForma(forma) {
  return ROTULOS[forma] ?? forma;
}

// Posição da forma na sequência oficial (formas antigas vão para o fim).
export function ordemDaForma(forma) {
  const i = FORMAS_VALIDAS.indexOf(forma);
  return i === -1 ? FORMAS_VALIDAS.length : i;
}
