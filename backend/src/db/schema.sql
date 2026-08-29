-- =========================================================================
-- Kina Kana PDV — Modelagem completa do banco de dados (SQLite)
-- =========================================================================
-- Este arquivo contém TODAS as tabelas previstas na especificação do
-- sistema. As tabelas usadas pelo fluxo essencial de balcão (implementado
-- nesta etapa) estão marcadas com [CORE]. As demais estão marcadas com
-- [ESTRUTURA] — existem e podem ser usadas pelas telas simplificadas, mas
-- a lógica de negócio completa (ex.: baixa avançada de estoque por receita,
-- motor de promoções, delivery com roteirização) fica para uma próxima
-- etapa, conforme o escopo combinado com o usuário.
-- =========================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- USUÁRIOS E PERMISSÕES [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  senha_hash    TEXT NOT NULL,
  papel         TEXT NOT NULL CHECK (papel IN ('admin','gerente','caixa','cozinha','entregador')),
  codigo        TEXT UNIQUE, -- código curto p/ ficha impressa (ex: "AT01")
  ativo         INTEGER NOT NULL DEFAULT 1,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Referência de permissões por papel (documental — aplicado também no
-- middleware do backend). Permite customizar via admin futuramente.
CREATE TABLE IF NOT EXISTS permissoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  papel         TEXT NOT NULL,
  permissao     TEXT NOT NULL, -- ex: 'pedidos.criar', 'caixa.fechar', 'desconto.autorizar'
  UNIQUE(papel, permissao)
);

-- ---------------------------------------------------------------------
-- CLIENTES E FIDELIDADE [CORE simplificado]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nome               TEXT NOT NULL,
  telefone           TEXT,
  data_nascimento    TEXT,
  endereco           TEXT,
  pontos_fidelidade  INTEGER NOT NULL DEFAULT 0,
  observacoes        TEXT,
  criado_em          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pontos_fidelidade (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id   INTEGER NOT NULL REFERENCES clientes(id),
  pedido_id    INTEGER REFERENCES pedidos(id),
  pontos       INTEGER NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('ganho','resgate')),
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cupons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo       TEXT UNIQUE NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('percentual','valor','produto_gratis')),
  valor        REAL NOT NULL DEFAULT 0,
  cliente_id   INTEGER REFERENCES clientes(id),
  validade     TEXT,
  usado        INTEGER NOT NULL DEFAULT 0,
  ativo        INTEGER NOT NULL DEFAULT 1,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- [ESTRUTURA] Regras de promoção configuráveis (horário, combo da tarde,
-- aniversário, fidelidade "a cada N compre ganhe 1" etc.)
CREATE TABLE IF NOT EXISTS promocoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('horario','combo_tarde','aniversario','cupom','fidelidade','produto_gratis')),
  regra_json   TEXT, -- ex: {"hora_inicio":"14:00","hora_fim":"17:00","desconto_pct":10}
  ativo        INTEGER NOT NULL DEFAULT 1,
  inicio       TEXT,
  fim          TEXT
);

-- ---------------------------------------------------------------------
-- CATÁLOGO: CATEGORIAS, PRODUTOS, COMBOS, ADICIONAIS [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nome    TEXT NOT NULL,
  icone   TEXT,       -- emoji/ícone usado no botão grande
  ordem   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produtos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id),
  nome          TEXT NOT NULL,
  descricao     TEXT,
  preco         REAL NOT NULL,
  custo         REAL NOT NULL DEFAULT 0,
  imagem        TEXT,       -- emoji ou caminho de imagem
  cor           TEXT,       -- cor do card (tema quente)
  disponivel    INTEGER NOT NULL DEFAULT 1,
  esgotado      INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adicionais (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nome    TEXT NOT NULL,
  preco   REAL NOT NULL DEFAULT 0,
  ativo   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS combos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  preco         REAL NOT NULL,
  imagem        TEXT,
  cor           TEXT,
  ativo         INTEGER NOT NULL DEFAULT 1
);

-- Itens que compõem um combo. Quando categoria_id não é nulo, o item é
-- "à escolha" dentro daquela categoria (ex: "escolha 1 pastel salgado");
-- quando produto_id é fixo, o item é obrigatório e fixo no combo.
CREATE TABLE IF NOT EXISTS combo_itens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  combo_id       INTEGER NOT NULL REFERENCES combos(id),
  produto_id     INTEGER REFERENCES produtos(id),
  categoria_id   INTEGER REFERENCES categorias(id),
  quantidade     INTEGER NOT NULL DEFAULT 1,
  rotulo         TEXT -- ex: "Escolha o sabor do pastel"
);

-- ---------------------------------------------------------------------
-- ESTOQUE / INGREDIENTES / FORNECEDORES [ESTRUTURA + baixa simples]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fornecedores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  telefone   TEXT,
  contato    TEXT
);

CREATE TABLE IF NOT EXISTS ingredientes (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                 TEXT NOT NULL,
  unidade              TEXT NOT NULL DEFAULT 'un', -- un, kg, g, l, ml
  quantidade_estoque   REAL NOT NULL DEFAULT 0,
  quantidade_minima    REAL NOT NULL DEFAULT 0,
  custo_unitario       REAL NOT NULL DEFAULT 0,
  fornecedor_id        INTEGER REFERENCES fornecedores(id)
);

CREATE TABLE IF NOT EXISTS produto_ingredientes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id        INTEGER NOT NULL REFERENCES produtos(id),
  ingrediente_id    INTEGER NOT NULL REFERENCES ingredientes(id),
  quantidade_usada  REAL NOT NULL
);

-- ---------------------------------------------------------------------
-- DELIVERY [ESTRUTURA]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motoboys (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  telefone  TEXT,
  veiculo   TEXT,
  ativo     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bairros_taxa (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  bairro          TEXT NOT NULL,
  taxa_entrega    REAL NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- PEDIDOS [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_senha             INTEGER NOT NULL, -- reinicia todo dia
  data_referencia          TEXT NOT NULL,    -- YYYY-MM-DD usado p/ sequência diária
  tipo                     TEXT NOT NULL DEFAULT 'balcao'
                             CHECK (tipo IN ('balcao','mesa','whatsapp','delivery','qrcode','autoatendimento')),
  mesa_numero              TEXT,
  cliente_id               INTEGER REFERENCES clientes(id),
  cliente_nome_avulso      TEXT,
  cliente_telefone_avulso  TEXT,
  funcionario_id           INTEGER NOT NULL REFERENCES usuarios(id),
  status                   TEXT NOT NULL DEFAULT 'aguardando_pagamento'
                             CHECK (status IN ('aguardando_pagamento','pago','em_preparo','pronto','entregue','cancelado','reembolsado')),
  subtotal                 REAL NOT NULL DEFAULT 0,
  desconto                 REAL NOT NULL DEFAULT 0,
  desconto_motivo          TEXT,
  desconto_autorizado_por  INTEGER REFERENCES usuarios(id),
  taxa_entrega             REAL NOT NULL DEFAULT 0,
  total                    REAL NOT NULL DEFAULT 0,
  endereco_entrega         TEXT,
  troco_para               REAL,
  motoboy_id               INTEGER REFERENCES motoboys(id),
  observacoes_gerais       TEXT,
  cupom_id                 INTEGER REFERENCES cupons(id),
  status_impressao         TEXT NOT NULL DEFAULT 'pendente' CHECK (status_impressao IN ('pendente','impresso','falha')),
  criado_em                TEXT NOT NULL DEFAULT (datetime('now')),
  pago_em                  TEXT,
  preparo_iniciado_em      TEXT,
  pronto_em                TEXT,
  entregue_em              TEXT,
  cancelado_em             TEXT,
  cancelado_motivo         TEXT
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_referencia);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id),
  produto_id       INTEGER REFERENCES produtos(id),
  combo_id         INTEGER REFERENCES combos(id),
  nome_snapshot    TEXT NOT NULL, -- nome no momento da venda (histórico não muda se produto mudar)
  quantidade       INTEGER NOT NULL DEFAULT 1,
  preco_unitario   REAL NOT NULL,
  observacao       TEXT,
  combo_escolhas   TEXT, -- JSON com as escolhas feitas dentro do combo
  subtotal         REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS item_adicionais (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  item_pedido_id    INTEGER NOT NULL REFERENCES itens_pedido(id),
  adicional_id      INTEGER NOT NULL REFERENCES adicionais(id),
  nome_snapshot     TEXT NOT NULL,
  quantidade        INTEGER NOT NULL DEFAULT 1,
  preco_unitario    REAL NOT NULL
);

-- ---------------------------------------------------------------------
-- PAGAMENTOS [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamentos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id),
  forma            TEXT NOT NULL CHECK (forma IN ('dinheiro','pix','credito','debito','vale_refeicao','vale_alimentacao','outros')),
  valor            REAL NOT NULL,
  valor_recebido   REAL,
  troco            REAL NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('aguardando','confirmado')),
  funcionario_id   INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- CAIXA [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caixas (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_abertura_id     INTEGER NOT NULL REFERENCES usuarios(id),
  valor_inicial               REAL NOT NULL DEFAULT 0,
  aberto_em                   TEXT NOT NULL DEFAULT (datetime('now')),
  funcionario_fechamento_id   INTEGER REFERENCES usuarios(id),
  valor_esperado              REAL,
  valor_contado                REAL,
  diferenca                   REAL,
  justificativa                TEXT,
  autorizado_por              INTEGER REFERENCES usuarios(id),
  fechado_em                  TEXT,
  status                      TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado'))
);

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  caixa_id         INTEGER NOT NULL REFERENCES caixas(id),
  pedido_id        INTEGER REFERENCES pedidos(id),
  tipo             TEXT NOT NULL CHECK (tipo IN ('venda','sangria','suprimento','cancelamento','reembolso','diferenca')),
  valor            REAL NOT NULL,
  descricao        TEXT,
  funcionario_id   INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- IMPRESSÃO [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impressoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id),
  tipo             TEXT NOT NULL CHECK (tipo IN ('original','reimpressao')),
  sucesso          INTEGER NOT NULL DEFAULT 1,
  erro             TEXT,
  funcionario_id   INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config_impressora (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_dispositivo   TEXT,
  largura_mm         INTEGER NOT NULL DEFAULT 80 CHECK (largura_mm IN (58,80)),
  padrao             INTEGER NOT NULL DEFAULT 1,
  ultima_conexao     TEXT
);

-- ---------------------------------------------------------------------
-- AUDITORIA [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER REFERENCES usuarios(id),
  acao         TEXT NOT NULL, -- ex: 'desconto', 'cancelamento', 'reembolso', 'reimpressao', 'abertura_caixa', 'fechamento_caixa'
  pedido_id    INTEGER REFERENCES pedidos(id),
  detalhes     TEXT,
  motivo       TEXT,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DA LOJA [CORE]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_loja (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  nome       TEXT NOT NULL DEFAULT 'Kina Kana Pastelaria',
  endereco   TEXT,
  telefone   TEXT,
  logo_url   TEXT
);
