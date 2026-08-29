const { db } = require('../db');

const inserir = db.prepare(`
  INSERT INTO auditoria (usuario_id, acao, pedido_id, detalhes, motivo)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Registra uma ação sensível no log de auditoria.
 * @param {number} usuarioId - quem realizou a ação
 * @param {string} acao - ex: 'desconto', 'cancelamento', 'reembolso', 'reimpressao'
 * @param {number|null} pedidoId
 * @param {object|string} detalhes
 * @param {string} [motivo]
 */
function registrarAuditoria(usuarioId, acao, pedidoId, detalhes, motivo) {
  inserir.run(
    usuarioId || null,
    acao,
    pedidoId || null,
    typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes || {}),
    motivo || null
  );
}

module.exports = { registrarAuditoria };
