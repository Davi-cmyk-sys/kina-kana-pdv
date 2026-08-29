"use client";

export default function BotaoApagar({ acao, id, confirmacao, className }) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(confirmacao)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        Apagar
      </button>
    </form>
  );
}
