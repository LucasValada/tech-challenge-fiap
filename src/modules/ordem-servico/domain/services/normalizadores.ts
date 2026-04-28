export function normalizarCpfCnpj(input: string): string {
  return input.replace(/\D/g, '');
}

export function normalizarPlaca(input: string): string {
  return input.trim().toUpperCase();
}
