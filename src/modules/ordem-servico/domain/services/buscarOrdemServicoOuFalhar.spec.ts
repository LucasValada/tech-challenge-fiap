import { NotFoundException } from '@nestjs/common';
import { buscarOrdemServicoOuFalhar } from './buscarOrdemServicoOuFalhar';
import { OrdemServicoRepository } from '../repository/ordem-servico.repository';

describe('buscarOrdemServicoOuFalhar', () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as OrdemServicoRepository;

  beforeEach(() => jest.clearAllMocks());

  it('retorna a ordem quando encontrada', async () => {
    const ordem = { id: 'ordem-1' };
    findById.mockResolvedValue(ordem);

    const result = await buscarOrdemServicoOuFalhar(repository, 'ordem-1');

    expect(result).toBe(ordem);
    expect(findById).toHaveBeenCalledWith('ordem-1');
  });

  it('lança NotFoundException quando a ordem não existe', async () => {
    findById.mockResolvedValue(null);

    await expect(
      buscarOrdemServicoOuFalhar(repository, 'inexistente'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
