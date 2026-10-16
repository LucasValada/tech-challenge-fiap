import { NotFoundException } from '@nestjs/common';
import type { ClienteRepository } from '../../domain/repository/cliente.repository';
import { BuscarClientePorCpfUseCase } from './buscar-cliente-por-cpf.use-case';

describe('BuscarClientePorCpfUseCase', () => {
  const repositorio = { findByCpfCnpj: jest.fn() };
  const useCase = new BuscarClientePorCpfUseCase(
    repositorio as unknown as ClienteRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('busca pelos dígitos do CPF e devolve só id, nome e status', async () => {
    repositorio.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      nome: 'Maria Silva',
      status: 'ATIVO',
      cpfCnpj: '52998224725',
      email: 'maria@email.com',
      telefone: '(11)999999999',
    });

    const cliente = await useCase.execute('529.982.247-25');

    expect(repositorio.findByCpfCnpj).toHaveBeenCalledWith('52998224725');
    expect(cliente).toEqual({
      id: 'cliente-1',
      nome: 'Maria Silva',
      status: 'ATIVO',
    });
  });

  it('cliente inexistente: 404', async () => {
    repositorio.findByCpfCnpj.mockResolvedValue(null);

    await expect(useCase.execute('52998224725')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
