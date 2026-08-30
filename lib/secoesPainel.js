// Lista única das seções do painel, usada tanto pelo menu inicial (cards)
// quanto pela barra de navegação fixa no topo — assim os dois lugares
// nunca ficam dessincronizados sobre quem pode acessar o quê.
export const SECOES_PAINEL = [
  {
    href: "/painel/pedido",
    label: "Novo Pedido",
    icone: "🥟",
    papeis: ["admin", "gerente", "caixa"],
  },
  {
    href: "/painel/pedidos",
    label: "Pedidos",
    icone: "📋",
    papeis: ["admin", "gerente", "caixa"],
  },
  {
    href: "/painel/caixa",
    label: "Caixa",
    icone: "💰",
    papeis: ["admin", "gerente", "caixa"],
  },
  {
    href: "/painel/impressora",
    label: "Impressora",
    icone: "🖨️",
    papeis: ["admin", "gerente", "caixa"],
  },
  {
    href: "/painel/produtos",
    label: "Cardápio",
    icone: "🍽️",
    papeis: ["admin", "gerente"],
  },
  {
    href: "/painel/combos",
    label: "Combos",
    icone: "🍱",
    papeis: ["admin", "gerente"],
  },
  {
    href: "/painel/estoque",
    label: "Estoque",
    icone: "📦",
    papeis: ["admin", "gerente"],
  },
  {
    href: "/painel/relatorios",
    label: "Relatórios",
    icone: "📊",
    papeis: ["admin", "gerente"],
  },
  {
    href: "/painel/funcionarios",
    label: "Funcionários",
    icone: "👥",
    papeis: ["admin"],
  },
  {
    href: "/painel/auditoria",
    label: "Auditoria",
    icone: "🕵️",
    papeis: ["admin"],
  },
];

export function secoesPermitidas(papel) {
  return SECOES_PAINEL.filter((s) => s.papeis.includes(papel));
}
