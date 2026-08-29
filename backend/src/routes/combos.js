const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const combos = db.prepare('SELECT * FROM combos WHERE ativo = 1 ORDER BY nome').all();
  const itensStmt = db.prepare(`
    SELECT ci.*, p.nome AS produto_nome, c.nome AS categoria_nome
    FROM combo_itens ci
    LEFT JOIN produtos p ON p.id = ci.produto_id
    LEFT JOIN categorias c ON c.id = ci.categoria_id
    WHERE ci.combo_id = ?
  `);
  const opcoesStmt = db.prepare('SELECT id, nome, preco, imagem FROM produtos WHERE categoria_id = ? AND disponivel = 1 AND esgotado = 0');

  const resultado = combos.map((combo) => {
    const itens = itensStmt.all(combo.id).map((item) => ({
      ...item,
      opcoes: item.categoria_id ? opcoesStmt.all(item.categoria_id) : [],
    }));
    return { ...combo, itens };
  });

  res.json(resultado);
});

router.post('/', permitir('admin', 'gerente'), (req, res) => {
  const { nome, descricao, preco, imagem, cor, itens } = req.body;
  if (!nome || preco == null) return res.status(400).json({ erro: 'nome e preco são obrigatórios.' });
  const info = db.prepare('INSERT INTO combos (nome, descricao, preco, imagem, cor) VALUES (?, ?, ?, ?, ?)')
    .run(nome, descricao || null, preco, imagem || '🍱', cor || 'green');
  const comboId = info.lastInsertRowid;
  const inserirItem = db.prepare('INSERT INTO combo_itens (combo_id, produto_id, categoria_id, quantidade, rotulo) VALUES (?, ?, ?, ?, ?)');
  for (const item of itens || []) {
    inserirItem.run(comboId, item.produtoId || null, item.categoriaId || null, item.quantidade || 1, item.rotulo || null);
  }
  res.status(201).json({ id: comboId });
});

module.exports = router;
