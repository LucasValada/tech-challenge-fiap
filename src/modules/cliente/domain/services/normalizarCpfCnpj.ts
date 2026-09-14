/**
 * Forma canônica do CPF/CNPJ do cliente = apenas dígitos.
 *
 * Precisa casar com a consulta da Lambda de autenticação por CPF, que normaliza
 * a entrada e busca `WHERE "cpfCnpj" = <dígitos>`. Guardar o valor formatado
 * (ex.: "529.982.247-25") faz a Lambda não encontrar o cliente e impede a
 * autenticação por CPF. Por isso normalizamos ao gravar/atualizar o cliente.
 */
export function normalizarCpfCnpj(input: string): string {
  return input.replace(/\D/g, '');
}
