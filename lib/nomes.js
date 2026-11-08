// Deixa um nome pronto para comparar: sem acentos, sem diferença entre
// maiúsculas e minúsculas e sem espaços sobrando. Usado na busca do login e
// para impedir dois funcionários com o mesmo nome (o nome é o que a pessoa
// escolhe na hora de entrar no sistema).
export function normalizarNome(texto) {
  return (texto ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
