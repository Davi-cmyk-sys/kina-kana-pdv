import "./globals.css";

export const metadata = {
  title: "Kina Kana PDV",
  description: "Sistema de balcão da Kina Kana Pastelaria.",
  applicationName: "Kina Kana",
  // iPhone: nome embaixo do ícone na tela de início e abertura em tela
  // cheia (sem a barra do Safari).
  appleWebApp: {
    capable: true,
    title: "Kina Kana",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#1f6f3e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
