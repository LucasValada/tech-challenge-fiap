import { NotFoundException } from '@nestjs/common';
import { GetMinhaOrdemServicoUseCase } from './get-minha-ordem-servico.use-case';
import {
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';

const CLIENTE_ID = 'cliente-1';
const OS_ID = 'os-1';

function detalheFake(
  clienteId = CLIENTE_ID,
): OrdemServicoDetalhadaView {
  return {
    id: OS_ID,
    codigo: 'OS-2026-000001',
    status: 'AGUARDANDO_APROVACAO',
    cliente: { id: clienteId, nome: 'Cliente', cpfCnpj: '111' },
  } as unknown as OrdemServicoDetalhadaView;
}

describe('GetMinhaOrdemServicoUseCase', () => {
  let repo: jest.Mocked<Pick<OrdemServicoRepository, 'findByIdComDetalhes'>>;
  let useCase: GetMinhaOrdemServicoUseCase;

  beforeEach(() => {
    repo = { findByIdComDetalhes: jest.fn() };
    useCase = new GetMinhaOrdemServicoUseCase(
      repo as unknown as OrdemServicoRepository,
    );
  });

  it('retorna o detalhe quando a OS pertence ao cliente', async () => {
    const detalhe = detalheFake();
    repo.findByIdComDetalhes.mockResolvedValue(detalhe);

    const result = await useCase.execute(CLIENTE_ID, OS_ID);

    expect(result).toBe(detalhe);
    expect(repo.findByIdComDetalhes).toHaveBeenCalledWith(OS_ID);
  });

  it('lança 404 quando a OS não existe', async () => {
    repo.findByIdComDetalhes.mockResolvedValue(null);

    await expect(useCase.execute(CLIENTE_ID, OS_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lança 404 quando a OS pertence a outro cliente (sem vazar existência)', async () => {
    repo.findByIdComDetalhes.mockResolvedValue(detalheFake('outro-cliente'));

    await expect(useCase.execute(CLIENTE_ID, OS_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
