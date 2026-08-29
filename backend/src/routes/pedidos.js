const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');
const { registrarAuditoria } = require('../utils/auditoria');

const router = express.Router();

const LIMITE_DESCONTO_SEM_AUTORIZACAO = Number(process.env.DISCOUNT_AUTH_LIMIT || 10);

function hojeISODate() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// TELA DE TV DO BALCÃO — pública (sem dados sensíveis, só senha/status)
// ---------------------------------------------------------------------
router.get('/prontos-tv', (req, res) => {
  const pedidos = db.prepare(`
    SELECT id, numero_senha, status, pronto_em, entregue_em, tipo
    FROM pedidos
    WHERE data_referencia = ? AND status IN ('pronto','entregue')
    ORDER BY COALESCE(pronto_em, entregue_em) DESC
    LIMIT 30
  `).all(hojeISODate());
  res.json(pedidos);
});

router.use(autenticar);

// ---------------------------------------------------------------------
// CRIAR PEDIDO
// ---------------------------------------------------------------------
router.post('/', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const body = req.body;
  const itensBody = body.itens || [];
  if (itensBody.length === 0) {
    return res.status(400).json({ erro: 'O pedido precisa ter ao menos um item.' });
  }

  const produtoStmt = db.prepare('SELECT * FROM produtos WHERE id = ?');
  const comboStmt = db.prepare('SELECT * FROM combos WHERE id = ?');
  const adicionalStmt = db.prepare('SELECT * FROM adicionais WHERE id = ?');

  // Monta itens com preços vindos do BANCO (nunca confia em preço do cliente)
  let subtotal = 0;
  const itensPreparados = [];
  for (const item of itensBody) {
    let nome, precoUnitario, produtoId = null, comboId = null;
    if (item.produtoId) {
      const produto = produtoStmt.get(item.produtoId);
      if (!produto) return res.status(400).json({ erro: `Produto ${item.produtoId} não encontrado.` });
      if (produto.esgotado) return res.status(400).json({ erro: `"${produto.nome}" está esgotado no momento.` });
      nome = produto.nome; precoUnitario = produto.preco; produtoId = produto.id;
    } else if (item.comboId) {
      const combo = comboStmt.get(item.comboId);
      if (!combo) return res.status(400).json({ erro: `Combo ${item.comboId} não encontrado.` });
      nome = combo.nome; precoUnitario = combo.preco; comboId = combo.id;
    } else if (item.adicionalAvulsoId) {
      // Venda de um adicional "avulso" direto da categoria Adicionais (ex: um sachê
      // extra, uma porção de molho), sem estar vinculado a um produto principal.
      const adicional = adicionalStmt.get(item.adicionalAvulsoId);
      if (!adicional) return res.status(400).json({ erro: `Adicional ${item.adicionalAvulsoId} não encontrado.` });
      nome = adicional.nome; precoUnitario = adicional.preco;
    } else {
      return res.status(400).json({ erro: 'Cada item precisa de produtoId, comboId ou adicionalAvulsoId.' });
    }

    let adicionaisTotal = 0;
    const adicionaisPreparados = [];
    for (const ad of item.adicionais || []) {
      const adicional = adicionalStmt.get(ad.adicionalId);
      if (!adicional) continue;
      const qtd = ad.quantidade || 1;
      adicionaisTotal += adicional.preco * qtd;
      adicionaisPreparados.push({ adicionalId: adicional.id, nome: adicional.nome, preco: adicional.preco, quantidade: qtd });
    }

    const quantidade = item.quantidade || 1;
    const itemSubtotal = (precoUnitario * quantidade) + adicionaisTotal;
    subtotal += itemSubtotal;

    itensPreparados.push({
      produtoId, comboId, nome, precoUnitario, quantidade,
      observacao: item.observacao || null,
      comboEscolhas: item.comboEscolhas ? JSON.stringify(item.comboEscolhas) : null,
      subtotal: itemSubtotal,
      adicionais: adicionaisPreparados,
    });
  }

  // Desconto (com regra de autorização de gerente acima do limite)
  let desconto = Number(body.desconto?.valor || 0);
  const descontoMotivo = body.desconto?.motivo || null;
  const descontoAutorizadoPor = body.desconto?.autorizadoPorId || null;
  if (desconto > 0 && desconto > LIMITE_DESCONTO_SEM_AUTORIZACAO && !descontoAutorizadoPor && !body.desconto?.autorizadoPorPin) {
    return res.status(403).json({
      erro: `Descontos acima de R$ ${LIMITE_DESCONTO_SEM_AUTORIZACAO.toFixed(2)} exigem autorização de um gerente.`,
      exigeAutorizacaoGerente: true,
    });
  }
  if (desconto > subtotal) desconto = subtotal;

  const taxaEntrega = Number(body.taxaEntrega || 0);
  const total = Math.max(0, subtotal - desconto + taxaEntrega);

  const transacao = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO pedidos (
        numero_senha, data_referencia, tipo, mesa_numero, cliente_id,
        cliente_nome_avulso, cliente_telefone_avulso, funcionario_id, status,
        subtotal, desconto, desconto_motivo, desconto_autorizado_por,
        taxa_entrega, total, endereco_entrega, troco_para, observacoes_gerais, cupom_id
      ) VALUES (0, ?, ?, ?, ?, ?, ?, ?, 'aguardando_pagamento', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      hojeISODate(), body.tipo || 'balcao', body.mesaNumero || null, body.clienteId || null,
      body.clienteNomeAvulso || null, body.clienteTelefoneAvulso || null, req.usuario.id,
      subtotal, desconto, descontoMotivo, descontoAutorizadoPor,
      taxaEntrega, total, body.enderecoEntrega || null, body.trocoPara || null,
      body.observacoesGerais || null, body.cupomId || null
    );
    const pedidoId = info.lastInsertRowid;

    const inserirItem = db.prepare(`
      INSERT INTO itens_pedido (pedido_id, produto_id, combo_id, nome_snapshot, quantidade, preco_unitario, observacao, combo_escolhas, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const inserirAdicional = db.prepare(`
      INSERT INTO item_adicionais (item_pedido_id, adicional_id, nome_snapshot, quantidade, preco_unitario)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of itensPreparados) {
      const r = inserirItem.run(pedidoId, item.produtoId, item.comboId, item.nome, item.quantidade, item.precoUnitario, item.observacao, item.comboEscolhas, item.subtotal);
      for (const ad of item.adicionais) {
        inserirAdicional.run(r.lastInsertRowid, ad.adicionalId, ad.nome, ad.quantidade, ad.preco);
      }
    }

    if (desconto > 0) {
      registrarAuditoria(req.usuario.id, 'desconto', pedidoId, { desconto, subtotal }, descontoMotivo);
    }

    return pedidoId;
  });

  const pedidoId = transacao();
  res.status(201).json(buscarPedidoCompleto(pedidoId));
});

// ---------------------------------------------------------------------
// LISTAR / BUSCAR PEDIDOS
// ---------------------------------------------------------------------
router.get('/', (req, res) => {
  const { numero, cliente, telefone, data, funcionarioId, status, formaPagamento } = req.query;
  let sql = `
    SELECT DISTINCT p.*, u.nome AS funcionario_nome, c.nome AS cliente_nome_cadastro
    FROM pedidos p
    LEFT JOIN usuarios u ON u.id = p.funcionario_id
    LEFT JOIN clientes c ON c.id = p.cliente_id
  `;
  const condicoes = [];
  const params = [];

  if (formaPagamento) {
    sql += ' JOIN pagamentos pg ON pg.pedido_id = p.id ';
    condicoes.push('pg.forma = ?');
    params.push(formaPagamento);
  }
  if (numero) { condicoes.push('p.numero_senha = ?'); params.push(numero); }
  if (cliente) { condicoes.push('(c.nome LIKE ? OR p.cliente_nome_avulso LIKE ?)'); params.push(`%${cliente}%`, `%${cliente}%`); }
  if (telefone) { condicoes.push('(c.telefone LIKE ? OR p.cliente_telefone_avulso LIKE ?)'); params.push(`%${telefone}%`, `%${telefone}%`); }
  if (data) { condicoes.push('p.data_referencia = ?'); params.push(data); }
  if (funcionarioId) { condicoes.push('p.funcionario_id = ?'); params.push(funcionarioId); }
  if (status) { condicoes.push('p.status = ?'); params.push(status); }

  if (condicoes.length) sql += ' WHERE ' + condicoes.join(' AND ');
  sql += ' ORDER BY p.criado_em DESC LIMIT 200';

  res.json(db.prepare(sql).all(...params));
});

// Fila da cozinha (pagos e em preparo, mais antigos primeiro)
router.get('/cozinha/fila', permitir('admin', 'gerente', 'caixa', 'cozinha'), (req, res) => {
  const pedidos = db.prepare(`
    SELECT * FROM pedidos
    WHERE status IN ('pago','em_preparo') AND data_referencia = ?
    ORDER BY criado_em ASC
  `).all(hojeISODate());
  res.json(pedidos.map((p) => buscarPedidoCompleto(p.id)));
});

function buscarPedidoCompleto(id) {
  const pedido = db.prepare(`
    SELECT p.*, u.nome AS funcionario_nome, c.nome AS cliente_nome_cadastro, c.telefone AS cliente_telefone_cadastro
    FROM pedidos p
    LEFT JOIN usuarios u ON u.id = p.funcionario_id
    LEFT JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = ?
  `).get(id);
  if (!pedido) return null;
  const itens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ?').all(id);
  const adicionaisStmt = db.prepare('SELECT * FROM item_adicionais WHERE item_pedido_id = ?');
  for (const item of itens) {
    item.adicionais = adicionaisStmt.all(item.id);
    if (item.combo_escolhas) {
      try { item.combo_escolhas = JSON.parse(item.combo_escolhas); } catch { /* ignore */ }
    }
  }
  const pagamentos = db.prepare('SELECT * FROM pagamentos WHERE pedido_id = ?').all(id);
  const impressoes = db.prepare('SELECT * FROM impressoes WHERE pedido_id = ? ORDER BY criado_em DESC').all(id);
  return { ...pedido, itens, pagamentos, impressoes };
}

router.get('/:id', (req, res) => {
  const pedido = buscarPedidoCompleto(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json(pedido);
});

// ---------------------------------------------------------------------
// PAGAMENTOS
// ---------------------------------------------------------------------
router.post('/:id/pagamentos', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  if (pedido.status !== 'aguardando_pagamento') {
    return res.status(400).json({ erro: `Pedido está com status "${pedido.status}" e não pode receber novo pagamento.` });
  }

  const pagamentosBody = req.body.pagamentos || [];
  if (pagamentosBody.length === 0) return res.status(400).json({ erro: 'Informe ao menos uma forma de pagamento.' });

  const inserirPagamento = db.prepare(`
    INSERT INTO pagamentos (pedido_id, forma, valor, valor_recebido, troco, status, funcionario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transacao = db.transaction(() => {
    let totalRecebido = 0;
    for (const pg of pagamentosBody) {
      const valorRecebido = pg.valorRecebido != null ? Number(pg.valorRecebido) : Number(pg.valor);
      const troco = pg.forma === 'dinheiro' ? Math.max(0, valorRecebido - Number(pg.valor)) : 0;
      const status = pg.forma === 'pix' ? (pg.status || 'aguardando') : 'confirmado';
      inserirPagamento.run(req.params.id, pg.forma, pg.valor, valorRecebido, troco, status, req.usuario.id);
      if (status === 'confirmado') totalRecebido += Number(pg.valor);
    }

    const totalConfirmado = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos WHERE pedido_id = ? AND status = 'confirmado'
    `).get(req.params.id).total;

    if (totalConfirmado >= pedido.total - 0.001) {
      finalizarPagamentoPedido(req.params.id, pedido, req.usuario.id);
    }
  });

  transacao();
  res.status(201).json(buscarPedidoCompleto(req.params.id));
});

router.patch('/:id/pagamentos/:pagamentoId/confirmar', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  db.prepare("UPDATE pagamentos SET status = 'confirmado' WHERE id = ?").run(req.params.pagamentoId);

  const totalConfirmado = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos WHERE pedido_id = ? AND status = 'confirmado'
  `).get(req.params.id).total;

  if (pedido.status === 'aguardando_pagamento' && totalConfirmado >= pedido.total - 0.001) {
    finalizarPagamentoPedido(req.params.id, pedido, req.usuario.id);
  }
  res.json(buscarPedidoCompleto(req.params.id));
});

function finalizarPagamentoPedido(pedidoId, pedido, funcionarioId) {
  const proximaSenha = db.prepare(`
    SELECT COALESCE(MAX(numero_senha), 0) + 1 AS proxima FROM pedidos WHERE data_referencia = ?
  `).get(pedido.data_referencia).proxima;

  db.prepare(`
    UPDATE pedidos SET status = 'pago', numero_senha = ?, pago_em = datetime('now') WHERE id = ?
  `).run(proximaSenha, pedidoId);

  // Registra a venda no caixa aberto, se houver
  const caixaAberto = db.prepare("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1").get();
  if (caixaAberto) {
    db.prepare(`
      INSERT INTO movimentacoes_caixa (caixa_id, pedido_id, tipo, valor, descricao, funcionario_id)
      VALUES (?, ?, 'venda', ?, ?, ?)
    `).run(caixaAberto.id, pedidoId, pedido.total, `Venda pedido #${proximaSenha}`, funcionarioId);
  }

  // Pontos de fidelidade: 1 ponto por R$1 gasto
  if (pedido.cliente_id) {
    const pontos = Math.floor(pedido.total);
    if (pontos > 0) {
      db.prepare(`INSERT INTO pontos_fidelidade (cliente_id, pedido_id, pontos, tipo) VALUES (?, ?, ?, 'ganho')`)
        .run(pedido.cliente_id, pedidoId, pontos);
      db.prepare('UPDATE clientes SET pontos_fidelidade = pontos_fidelidade + ? WHERE id = ?').run(pontos, pedido.cliente_id);
    }
  }
}

// ---------------------------------------------------------------------
// ATUALIZAR STATUS (cozinha / entrega)
// ---------------------------------------------------------------------
const TRANSICOES_VALIDAS = {
  pago: ['em_preparo', 'cancelado'],
  em_preparo: ['pronto', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
};

router.patch('/:id/status', permitir('admin', 'gerente', 'caixa', 'cozinha', 'entregador'), (req, res) => {
  const { status } = req.body;
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  const permitido = TRANSICOES_VALIDAS[pedido.status] || [];
  if (!permitido.includes(status)) {
    return res.status(400).json({ erro: `Não é possível mudar de "${pedido.status}" para "${status}".` });
  }

  const campoData = { em_preparo: 'preparo_iniciado_em', pronto: 'pronto_em', entregue: 'entregue_em' }[status];
  db.prepare(`UPDATE pedidos SET status = ?, ${campoData} = datetime('now') WHERE id = ?`).run(status, req.params.id);
  res.json(buscarPedidoCompleto(req.params.id));
});

// ---------------------------------------------------------------------
// CANCELAMENTO / REEMBOLSO (exige autorização de gerente)
// ---------------------------------------------------------------------
router.post('/:id/cancelar', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { motivo, autorizadoPorId } = req.body;
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  if (!motivo) return res.status(400).json({ erro: 'Informe o motivo do cancelamento.' });

  const jaEstavaPago = ['pago', 'em_preparo', 'pronto'].includes(pedido.status);
  if (jaEstavaPago && !autorizadoPorId && req.usuario.papel === 'caixa') {
    return res.status(403).json({ erro: 'Cancelar um pedido já pago exige autorização de gerente.', exigeAutorizacaoGerente: true });
  }

  db.prepare(`UPDATE pedidos SET status = 'cancelado', cancelado_em = datetime('now'), cancelado_motivo = ? WHERE id = ?`).run(motivo, req.params.id);

  if (jaEstavaPago) {
    const caixaAberto = db.prepare("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1").get();
    if (caixaAberto) {
      db.prepare(`
        INSERT INTO movimentacoes_caixa (caixa_id, pedido_id, tipo, valor, descricao, funcionario_id)
        VALUES (?, ?, 'cancelamento', ?, ?, ?)
      `).run(caixaAberto.id, req.params.id, -pedido.total, `Cancelamento pedido #${pedido.numero_senha}: ${motivo}`, req.usuario.id);
    }
  }

  registrarAuditoria(req.usuario.id, 'cancelamento', req.params.id, { autorizadoPorId }, motivo);
  res.json(buscarPedidoCompleto(req.params.id));
});

router.post('/:id/reembolsar', permitir('admin', 'gerente'), (req, res) => {
  const { motivo } = req.body;
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  if (!motivo) return res.status(400).json({ erro: 'Informe o motivo do reembolso.' });

  db.prepare(`UPDATE pedidos SET status = 'reembolsado' WHERE id = ?`).run(req.params.id);

  const caixaAberto = db.prepare("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1").get();
  if (caixaAberto) {
    db.prepare(`
      INSERT INTO movimentacoes_caixa (caixa_id, pedido_id, tipo, valor, descricao, funcionario_id)
      VALUES (?, ?, 'reembolso', ?, ?, ?)
    `).run(caixaAberto.id, req.params.id, -pedido.total, `Reembolso pedido #${pedido.numero_senha}: ${motivo}`, req.usuario.id);
  }

  registrarAuditoria(req.usuario.id, 'reembolso', req.params.id, {}, motivo);
  res.json(buscarPedidoCompleto(req.params.id));
});

// ---------------------------------------------------------------------
// FICHA DE IMPRESSÃO
// ---------------------------------------------------------------------
router.get('/:id/ficha', (req, res) => {
  const pedido = buscarPedidoCompleto(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const loja = db.prepare('SELECT * FROM config_loja WHERE id = 1').get();
  const qtdImpressoes = db.prepare('SELECT COUNT(*) AS n FROM impressoes WHERE pedido_id = ?').get(req.params.id).n;
  res.json({ pedido, loja, viaOriginal: qtdImpressoes === 0 });
});

router.post('/:id/registrar-impressao', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { sucesso, erro, tipo } = req.body;
  db.prepare(`
    INSERT INTO impressoes (pedido_id, tipo, sucesso, erro, funcionario_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, tipo || 'original', sucesso ? 1 : 0, erro || null, req.usuario.id);

  db.prepare('UPDATE pedidos SET status_impressao = ? WHERE id = ?').run(sucesso ? 'impresso' : 'falha', req.params.id);

  if (!sucesso) {
    registrarAuditoria(req.usuario.id, 'falha_impressao', req.params.id, { erro }, null);
  }
  if (tipo === 'reimpressao') {
    registrarAuditoria(req.usuario.id, 'reimpressao', req.params.id, {}, req.body.motivo || null);
  }
  res.json({ ok: true });
});

module.exports = router;
