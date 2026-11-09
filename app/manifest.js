// Dados do "app" quando o sistema é adicionado à tela de início do celular
// (Android/Chrome). No iPhone o ícone vem de app/apple-icon.png.
export default function manifest() {
  return {
    name: "Kina Kana PDV",
    short_name: "Kina Kana",
    description: "Sistema de balcão da Kina Kana Pastelaria.",
    // Abrir pelo ícone é "entrar no sistema": cai na tela de login, como
    // pela página inicial.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#1f6f3e",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icones/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
