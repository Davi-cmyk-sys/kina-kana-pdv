# Tecnologias utilizadas e por quê

## Visão geral da stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 18 + Vite | Interface rápida, componentizada, ótimo suporte a PWA e hot-reload para iterar rápido no visual do balcão. |
| Estilo | Tailwind CSS | Permite criar botões grandes, alto contraste e o tema verde/branco + acentos quentes rapidamente, com suporte nativo a modo escuro (`dark:`). |
| Estado | Zustand | Store simples e leve para carrinho, autenticação, tema e status de conexão, sem o boilerplate do Redux. |
| PWA/Offline | vite-plugin-pwa + IndexedDB (`idb`) | Permite instalar o sistema no tablet/celular como app e continuar operando (fila de pedidos) sem internet. |
| Impressão térmica | Web Bluetooth API + ESC/POS manual | Único caminho para imprimir via Bluetooth **direto do navegador**, sem instalar nada — ver limitações em `IMPRESSAO_BLUETOOTH.md`. |
| Backend | Node.js + Express | API REST simples, madura, fácil de hospedar em qualquer VPS ou serviço gerenciado. |
| Banco de dados | SQLite (via `better-sqlite3`) | Zero configuração de servidor de banco — ideal para uma loja com 1-3 terminais no mesmo local/rede. Arquivo único, fácil de fazer backup. Pode ser trocado por PostgreSQL/MySQL no futuro sem mudar a modelagem. |
| Autenticação | JWT (`jsonwebtoken`) + bcrypt | Padrão de mercado, simples de validar em cada rota e de expirar sessões. |

## Por que SQLite e não PostgreSQL/MySQL?

Para uma pastelaria com um ou poucos terminais de balcão na mesma rede local, SQLite elimina a necessidade de instalar e manter um servidor de banco separado — o "banco" é só um arquivo (`backend/data/kinakana.sqlite`), fácil de copiar para backup. Quando o negócio crescer (múltiplas lojas, acesso remoto simultâneo de muitos terminais), a migração para PostgreSQL é direta porque o SQL usado é padrão; a camada de acesso está isolada em `backend/src/db/`.

## Por que Web Bluetooth em vez de um app nativo desde já?

Web Bluetooth permite conectar numa impressora térmica **direto do navegador**, sem instalar nenhum aplicativo — ótimo para começar rápido. A limitação é que só funciona em navegadores Chromium. Para uma operação 100% confiável a médio prazo, recomendamos migrar a impressão para um app Android nativo ou um pequeno serviço desktop — os detalhes e o porquê estão em `docs/IMPRESSAO_BLUETOOTH.md`.

## Estrutura de pastas

```
kina-kana-pdv/
├── backend/            # API Node/Express + banco SQLite
│   └── src/
│       ├── db/          # schema.sql, seed.js, conexão
│       ├── middleware/  # autenticação e permissões
│       ├── routes/      # uma rota por domínio (pedidos, caixa, etc.)
│       └── utils/       # auditoria, helpers
├── frontend/            # PWA React (interface do balcão)
│   └── src/
│       ├── components/  # peças reutilizáveis (carrinho, modais, cards)
│       ├── pages/        # uma tela por rota
│       ├── lib/          # api client, stores, fila offline, impressora Bluetooth
│       └── styles/
└── docs/                # esta documentação
```

## Alternativas consideradas

- **Next.js full-stack + PostgreSQL**: mais robusto para múltiplas lojas/acesso remoto simultâneo de muitos terminais, mas exige rodar um servidor de PostgreSQL — mais complexo para começar em uma única loja.
- **Electron/app desktop nativo**: melhor controle de hardware (impressora, gaveta de dinheiro), mas exige empacotar e distribuir instaladores por sistema operacional. Pode ser um passo futuro reaproveitando o mesmo frontend React (ver `IMPRESSAO_BLUETOOTH.md`).
- **App Android nativo (Kotlin) só para a impressão**: a opção mais confiável para Bluetooth em produção — documentada como próximo passo recomendado.
