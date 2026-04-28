export interface TotaisOS {
  valorServicos: number;
  valorPecas: number;
  valorTotal: number;
}

function arredondar2Casas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularSubtotal(
  precoUnitario: number,
  quantidade: number,
): number {
  const subtotal = precoUnitario * quantidade;
  if (!Number.isFinite(subtotal)) return 0;
  return arredondar2Casas(subtotal);
}

export function calcularTotais(
  servicos: { subtotal: number }[],
  itens: { subtotal: number }[],
): TotaisOS {
  const valorServicos = arredondar2Casas(
    servicos.reduce((acc, s) => acc + Number(s.subtotal), 0),
  );
  const valorPecas = arredondar2Casas(
    itens.reduce((acc, i) => acc + Number(i.subtotal), 0),
  );
  const valorTotal = arredondar2Casas(valorServicos + valorPecas);
  return { valorServicos, valorPecas, valorTotal };
}
