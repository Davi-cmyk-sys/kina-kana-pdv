// Funções que um colaborador pode ter na empresa. Dá para marcar mais de
// uma. Quando a pessoa tem acesso ao sistema, o nível de acesso dela segue a
// função mais alta marcada (a lista está da mais alta para a mais baixa).
export const FUNCOES = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "gerente", rotulo: "Gerente" },
  { valor: "caixa", rotulo: "Caixa" },
  { valor: "cozinha", rotulo: "Cozinha" },
  { valor: "entregador", rotulo: "Entregador" },
];

export const FUNCOES_VALIDAS = FUNCOES.map((f) => f.valor);

export function nomeDaFuncao(funcao) {
  return FUNCOES.find((f) => f.valor === funcao)?.rotulo ?? funcao;
}

// Papel de acesso ao sistema = a função mais alta marcada.
export function papelDasFuncoes(funcoes) {
  return FUNCOES_VALIDAS.find((f) => funcoes?.includes(f)) ?? null;
}

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export function soDigitos(texto) {
  return (texto ?? "").toString().replace(/\D/g, "");
}

// Confere os dois dígitos verificadores do CPF.
export function cpfValido(texto) {
  const cpf = soDigitos(texto);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (base.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return (
    digito(cpf.slice(0, 9)) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10)) === Number(cpf[10])
  );
}

export function formatarCpf(texto) {
  const d = soDigitos(texto).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatarCep(texto) {
  const d = soDigitos(texto).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
