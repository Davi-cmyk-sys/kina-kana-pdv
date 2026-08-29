import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Sistema Kina Kana PDV — configuração do Vite
// PWA: permite instalar no tablet/celular e funcionar offline no balcão.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'Kina Kana PDV',
        short_name: 'Kina Kana',
        description: 'Sistema de balcão da Kina Kana Pastelaria',
        theme_color: '#166534',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Nunca colocar em cache respostas de API que mudam a todo momento (pedidos),
        // mas permite que o app (HTML/CSS/JS) abra normalmente offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
