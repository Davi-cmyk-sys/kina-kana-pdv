// Calcula quais seções do painel cada pessoa pode ver.
//
// Regra nova (mais simples): quem é "master" vê e pode usar todos os
// botões do painel. Quem não é master vê só o essencial do dia a dia:
// Novo Pedido, Produção Cozinha, Caixa (abrir/fechar/verificar) e
// Solicitar Compras — não importa o "papel" (admin/gerente/caixa/
// cozinha/entregador) que a pessoa tenha. O papel continua existindo no
// cadastro (serve pra outras coisas e pra histórico), mas não decide
// mais, por si só, o que aparece no menu.
//
// Funcionários e Auditoria continuam de fora do bloqueio personalizado:
// são sempre master-only (Funcionários) ou admin-only (Auditoria),
// nunca liberadas pela lista de bloqueio nem pelo fato de alguém ser
// master. Notificações também é sempre master-only.
import { SECOES_PAINEL } from "./secoesPainel";

const SECOES_NAO_PERSONALIZAVEIS = new Set([
  "/painel/auditoria",
  "/painel/notificacoes",
]);

// Telas que qualquer colaborador ativo (não-master) continua vendo.
const SECOES_COLABORADOR = new Set([
  "/painel/pedido",
  "/painel/producao",
  "/painel/caixa",
  "/painel/compras",
]);

export function calcularAcessos({ master, secoesBloqueadas }) {
  const bloqueadas = new Set(
    Array.isArray(secoesBloqueadas) ? secoesBloqueadas : []
  );
  const souMaster = master === true;

  return SECOES_PAINEL.filter((secao) => {
    if (secao.href === "/painel/funcionarios") {
      // Só quem é master pode gerenciar contas — mas mesmo um master pode
      // ter essa aba escondida por outro master, se for o caso.
      return souMaster && !bloqueadas.has(secao.href);
    }
    if (secao.href === "/painel/auditoria") {
      // Auditoria é estrutural: continua só pra quem é master (que é quem
      // enxerga tudo agora), nunca personalizável.
      return souMaster;
    }
    if (secao.href === "/painel/notificacoes") {
      return souMaster;
    }
    if (souMaster) {
      return !bloqueadas.has(secao.href);
    }
    return SECOES_COLABORADOR.has(secao.href) && !bloqueadas.has(secao.href);
  });
}

export function temAcesso(href, { master, secoesBloqueadas }) {
  return calcularAcessos({ master, secoesBloqueadas }).some(
    (s) => s.href === href
  );
}

export { SECOES_NAO_PERSONALIZAVEIS };
