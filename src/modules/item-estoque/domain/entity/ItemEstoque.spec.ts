import { ItemEstoque } from './ItemEstoque';

describe('ItemEstoque entity', () => {
  it('instancia com todos os campos', () => {
    const now = new Date();
    const item = new ItemEstoque(
      'id-1',
      'Filtro de óleo',
      'PECA',
      'FIL-001',
      'Filtro compatível com motor 1.0',
      25.9,
      100,
      10,
      true,
      now,
      now,
    );

    expect(item.id).toBe('id-1');
    expect(item.nome).toBe('Filtro de óleo');
    expect(item.tipo).toBe('PECA');
    expect(item.sku).toBe('FIL-001');
    expect(item.precoUnitario).toBe(25.9);
    expect(item.quantidadeEstoque).toBe(100);
    expect(item.estoqueMinimo).toBe(10);
    expect(item.ativo).toBe(true);
  });
});
