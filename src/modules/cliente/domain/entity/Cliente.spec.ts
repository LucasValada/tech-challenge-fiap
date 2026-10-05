import { Cliente } from './Cliente';

describe('Cliente', () => {
  it('nasce ATIVO quando o status não é informado', () => {
    const cliente = new Cliente(
      'Maria Souza',
      '11999990000',
      'maria@exemplo.com',
      '52998224725',
      'FISICA',
    );

    expect(cliente.status).toBe('ATIVO');
    expect(cliente.id).toBeUndefined();
  });

  it('mantém os dados informados, inclusive o status INATIVO', () => {
    const criadoEm = new Date('2026-10-01T10:00:00Z');
    const cliente = new Cliente(
      'Oficina Parceira Ltda',
      null,
      null,
      '11222333000181',
      'JURIDICA',
      'INATIVO',
      'c1',
      criadoEm,
      criadoEm,
    );

    expect(cliente).toMatchObject({
      nome: 'Oficina Parceira Ltda',
      telefone: null,
      email: null,
      cpfCnpj: '11222333000181',
      tipoPessoa: 'JURIDICA',
      status: 'INATIVO',
      id: 'c1',
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });
  });
});
