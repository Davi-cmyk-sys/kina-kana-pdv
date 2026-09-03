// Calcula quais seções do painel cada pessoa pode ver, juntando duas
// regras:
// 1. O padrão de cada papel (lib/secoesPainel.js).
// 2. Uma lista de telas BLOQUEADAS por usuário (perfis.secoes_bloqueadas)
//    — quando definida, tira do padrão do papel as telas que estão nessa
//    lista. É assim que um master consegue, por exemplo, tirar o acesso a
//    Relatórios (lucro da loja) de um funcionário "gerente" específico,
//    mesmo que gerente normalmente veja Relatórios.
//
// Auditoria fica de fora desse bloqueio de propósito: é uma tela
// estrutural (histórico de segurança) e continua controlada só por quem
// é admin, nunca pela lista personalizada. Funcionários pode ser
// bloqueada normalmente — quem não é master já não vê de qualquer jeito,
// mas dá pra esconder até de outro master, se for o caso.
import { SECOES_PAINEL } from "./secoesPainel";

const SECOES_NAO_PERSONALIZAVEIS = new Set(["/painel/auditoria"]);

export function calcularAcessos({ papel, master, secoesBloqueadas }) {
  const bloqueadas = new Set(
    Array.isArray(secoesBloqueadas) ? secoesBloqueadas : []
  );

  return SECOES_PAINEL.filter((secao) => {
    if (secao.href === "/painel/funcionarios") {
      // Só quem é master pode gerenciar contas — mas mesmo um master pode
      // ter essa aba escondida por outro master, se for o caso.
      return master === true && !bloqueadas.has(secao.href);
    }
    if (secao.href === "/painel/auditoria") {
      return papel === "admin";
    }
    if (!secao.papeis.includes(papel)) {
      return false;
    }
    return !bloqueadas.has(secao.href);
  });
}

export function temAcesso(href, { papel, master, secoesBloqueadas }) {
  return calcularAcessos({ papel, master, secoesBloqueadas }).some(
    (s) => s.href === href
  );
}

export { SECOES_NAO_PERSONALIZAVEIS };
