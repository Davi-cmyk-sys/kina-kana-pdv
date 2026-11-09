"use client";

import { useRef, useState } from "react";

// Campo de foto que reduz a imagem no próprio aparelho antes de enviar
// (lado maior até 1280px, JPEG). Foto de celular costuma ter 3–5 MB e o
// servidor só aceita até 1 MB por envio; reduzida, fica com ~200 KB e
// continua nítida na tela.
const LADO_MAXIMO = 1280;
const QUALIDADE = 0.85;

async function reduzirImagem(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const escala = Math.min(
      1,
      LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight)
    );
    const largura = Math.round(imagem.naturalWidth * escala);
    const altura = Math.round(imagem.naturalHeight * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(imagem, 0, 0, largura, altura);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE)
    );
    if (!blob) return null;
    const nome = (arquivo.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CampoFoto({
  name,
  fotoAtual = null,
  className = "",
  formatoPrevia = "quadrado",
}) {
  const visivelRef = useRef(null);
  const ocultoRef = useRef(null);
  const [previa, setPrevia] = useState(fotoAtual);
  const [nomeNoVisivel, setNomeNoVisivel] = useState(false);
  const [processando, setProcessando] = useState(false);

  async function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setProcessando(true);
    try {
      const reduzida = await reduzirImagem(arquivo);
      if (reduzida && typeof DataTransfer !== "undefined") {
        const transferencia = new DataTransfer();
        transferencia.items.add(reduzida);
        ocultoRef.current.files = transferencia.files;
        setNomeNoVisivel(false);
        setPrevia(URL.createObjectURL(reduzida));
        return;
      }
      throw new Error("sem suporte");
    } catch {
      // Navegador sem suporte: envia o arquivo original mesmo.
      if (ocultoRef.current) ocultoRef.current.value = "";
      setNomeNoVisivel(true);
      setPrevia(URL.createObjectURL(arquivo));
    } finally {
      setProcessando(false);
    }
  }

  const classePrevia =
    formatoPrevia === "redondo"
      ? "h-24 w-24 rounded-full"
      : "h-24 w-24 rounded-xl";

  return (
    <div className="mt-1 flex items-center gap-3">
      {previa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previa}
          alt="Prévia da foto"
          className={`${classePrevia} shrink-0 border border-[#dcdfd2] object-cover`}
        />
      ) : (
        <div
          className={`${classePrevia} flex shrink-0 items-center justify-center border border-dashed border-[#dcdfd2] bg-[#f6f4ee] text-2xl text-[#8b968a]`}
          aria-hidden="true"
        >
          📷
        </div>
      )}
      <div className="min-w-0 flex-1">
        <input
          ref={visivelRef}
          type="file"
          accept="image/*"
          name={nomeNoVisivel ? name : undefined}
          onChange={aoEscolher}
          className={className}
        />
        <input
          ref={ocultoRef}
          type="file"
          name={nomeNoVisivel ? undefined : name}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        {processando && (
          <p className="mt-1 text-xs text-[#8b968a]">Preparando a foto…</p>
        )}
      </div>
    </div>
  );
}
