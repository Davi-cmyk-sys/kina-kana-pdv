// Mapa de classes Tailwind completas (para o JIT do Tailwind conseguir detectar
// as classes, elas precisam existir como strings literais em algum arquivo do
// projeto — por isso não usamos template strings dinâmicas como `bg-${cor}-500`).
export const CORES_CARD = {
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    borda: 'border-amber-300 dark:border-amber-800',
    texto: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    borda: 'border-orange-300 dark:border-orange-800',
    texto: 'text-orange-900 dark:text-orange-200',
    badge: 'bg-orange-500',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    borda: 'border-rose-300 dark:border-rose-800',
    texto: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-500',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    borda: 'border-sky-300 dark:border-sky-800',
    texto: 'text-sky-900 dark:text-sky-200',
    badge: 'bg-sky-500',
  },
  lime: {
    bg: 'bg-lime-50 dark:bg-lime-950/30',
    borda: 'border-lime-300 dark:border-lime-800',
    texto: 'text-lime-900 dark:text-lime-200',
    badge: 'bg-lime-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    borda: 'border-red-300 dark:border-red-800',
    texto: 'text-red-900 dark:text-red-200',
    badge: 'bg-red-500',
  },
  green: {
    bg: 'bg-marca-50 dark:bg-marca-950/30',
    borda: 'border-marca-300 dark:border-marca-700',
    texto: 'text-marca-900 dark:text-marca-200',
    badge: 'bg-marca-600',
  },
};

export function corDoCard(cor) {
  return CORES_CARD[cor] || CORES_CARD.amber;
}
