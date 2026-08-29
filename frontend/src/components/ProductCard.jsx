import { corDoCard } from '../lib/corMap';

export default function ProductCard({ nome, preco, imagem, cor, esgotado, onClick, descricao }) {
  const c = corDoCard(cor);
  return (
    <button
      type="button"
      disabled={esgotado}
      onClick={onClick}
      className={`btn-toque relative flex flex-col items-center justify-between text-center rounded-2xl border-2 ${c.borda} ${c.bg} p-3 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 min-h-[150px]`}
    >
      {esgotado && (
        <span className="absolute top-2 right-2 bg-neutral-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          ESGOTADO
        </span>
      )}
      <span className="text-5xl leading-none my-2">{imagem || '🍽️'}</span>
      <span className={`font-bold text-sm leading-tight ${c.texto}`}>{nome}</span>
      {descricao && <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{descricao}</span>}
      <span className={`mt-2 text-white text-sm font-extrabold rounded-full px-3 py-1 ${c.badge}`}>
        R$ {Number(preco).toFixed(2)}
      </span>
    </button>
  );
}
