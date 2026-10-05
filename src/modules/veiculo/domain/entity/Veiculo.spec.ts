import { Veiculo } from './Veiculo';

describe('Veiculo', () => {
  it('mantém os dados informados', () => {
    const criadoEm = new Date('2026-10-01T10:00:00Z');
    const veiculo = new Veiculo(
      'v1',
      'c1',
      'ABC1D23',
      'Fiat',
      'Uno',
      2020,
      criadoEm,
      criadoEm,
    );

    expect(veiculo).toMatchObject({
      id: 'v1',
      clienteId: 'c1',
      placa: 'ABC1D23',
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });
  });
});
