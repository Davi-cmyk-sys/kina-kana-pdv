// Aparece na hora em que se toca num botão do menu, enquanto a próxima tela
// é montada no servidor — assim o clique tem resposta imediata.
export default function Carregando() {
  return (
    <div className="mx-auto w-full max-w-3xl" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-medium text-[#5b6b5c]">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-[#1f6f3e]/25 border-t-[#1f6f3e]"
        />
        Carregando…
      </div>
      <div className="mt-6 space-y-3 motion-safe:animate-pulse">
        <div className="h-7 w-48 rounded-lg bg-[#e6e3d8]" />
        <div className="h-4 w-72 max-w-full rounded bg-[#eceae0]" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
