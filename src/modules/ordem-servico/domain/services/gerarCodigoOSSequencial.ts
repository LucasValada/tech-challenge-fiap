export function gerarCodigoOSSequencial(ano: number, contador: number): string {
  return `OS-${ano}-${String(contador).padStart(6, '0')}`;
}
