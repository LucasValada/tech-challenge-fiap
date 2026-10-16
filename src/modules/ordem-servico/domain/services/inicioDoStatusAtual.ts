/**
 * Entrada do histórico que marca quando a OS entrou no status atual: a mais
 * antiga da sequência mais recente com o mesmo status.
 *
 * O histórico pode repetir o status em entradas informativas (por exemplo, uma
 * tentativa de pagamento recusada), que não podem zerar a contagem do tempo no
 * status. `historico` vem da entrada mais recente para a mais antiga.
 */
export function inicioDoStatusAtual<T extends { status: string }>(
  historico: T[],
): T | undefined {
  let inicio: T | undefined;
  for (const entrada of historico) {
    if (inicio && entrada.status !== inicio.status) break;
    inicio = entrada;
  }
  return inicio;
}
