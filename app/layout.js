import "./globals.css";

export const metadata = {
  title: "Kina Kana PDV",
  description: "Sistema de balcão da Kina Kana Pastelaria.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
