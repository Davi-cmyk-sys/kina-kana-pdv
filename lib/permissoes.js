// Calcula quais seções do painel cada pessoa pode ver, juntando duas
// regras:
// 1. O padrão de cada papel (lib/secoesPainel.js).
// 2. Uma lista de telas BLOQUEADAS por usuário (perfis.secoes_bloqueadas)
//    — quando definida, tira do padrão do papel as telas que estão nessa
//    lista. É assim que um master consegue, por exemplo, tirar o acesso a
//    Relatórios (lucro da loja) de um funcionário "gerente" específico,
//    mesmo que gerente normalmente veja Relatórios.
//
// Funcionários e Auditoria ficam de fora desse bloqueio de propósito: são
// telas estruturais (gestão de contas e histórico de segurança) e
// continuam controladas só por master/admin, nunca pela lista
// personalizada.
import { SECOES_PAINEL } from "./secoesPainel";

const SECOES_NAO_PERSONALIZAVEIS = new Set([
  "/painel/funcionarios",
  "/painel/auditoria",
]);

export function calcularAcessos({ papel, master, secoesBloqueadas }) {
  const bloqueadas = new Set(
    Array.isArray(secoesBloqueadas) ? secoesBloqueadas : []
  );

  return SECOES_PAINEL.filter((secao) => {
    if (secao.href === "/painel/funcionarios") {
      return master === true;
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
