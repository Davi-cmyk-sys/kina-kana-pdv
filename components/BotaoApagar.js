"use client";

export default function BotaoApagar({
  acao,
  campos,
  confirmacao,
  className,
  texto = "Apagar",
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(confirmacao)) {
          e.preventDefault();
        }
      }}
    >
      {Object.entries(campos ?? {}).map(([nomeCampo, valor]) => (
        <input key={nomeCampo} type="hidden" name={nomeCampo} value={valor} />
      ))}
      <button type="submit" className={className}>
        {texto}
      </button>
    </form>
  );
}
