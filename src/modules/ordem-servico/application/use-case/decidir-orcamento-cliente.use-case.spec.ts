import { ConflictException, NotFoundException } from '@nestjs/common';
import { DecidirOrcamentoClienteUseCase } from './decidir-orcamento-cliente.use-case';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';

const CLIENTE_ID = 'cliente-1';
const OS_ID = 'os-1';

function ordemFake(
  overrides: Partial<OrdemServico> = {},
): OrdemServico {
  const ordem = new OrdemServico(
    CLIENTE_ID,
    'veiculo-1',
    'usuario-criador-1',
    'AGUARDANDO_APROVACAO',
    null,
    100,
    50,
    150,
    'OS-2026-000001',
    OS_ID,
  );
  return Object.assign(ordem, overrides);
}

describe('DecidirOrcamentoClienteUseCase', () => {
  let repo: jest.Mocked<Pick<OrdemServicoRepository, 'findById' | 'transicionarStatus'>>;
  let useCase: DecidirOrcamentoClienteUseCase;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      transicionarStatus: jest.fn(),
    };
    useCase = new DecidirOrcamentoClienteUseCase(
      repo as unknown as OrdemServicoRepository,
    );
  });

  it('aprovar: transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO (AVANCO)', async () => {
    const ordem = ordemFake();
    repo.findById.mockResolvedValue(ordem);
    const atualizada = ordemFake({ status: 'EM_EXECUCAO' });
    repo.transicionarStatus.mockResolvedValue(atualizada);

    const result = await useCase.execute(CLIENTE_ID, OS_ID, true);

    expect(result).toBe(atualizada);
    expect(repo.transicionarStatus).toHaveBeenCalledWith(
      OS_ID,
      'EM_EXECUCAO',
      'AVANCO',
      'usuario-criador-1',
      'Orçamento aprovado pelo cliente (autenticação por CPF)',
    );
  });

  it('rejeitar: transiciona AGUARDANDO_APROVACAO → EM_DIAGNOSTICO (ROLLBACK)', async () => {
    repo.findById.mockResolvedValue(ordemFake());
    repo.transicionarStatus.mockResolvedValue(
      ordemFake({ status: 'EM_DIAGNOSTICO' }),
    );

    await useCase.execute(CLIENTE_ID, OS_ID, false);

    expect(repo.transicionarStatus).toHaveBeenCalledWith(
      OS_ID,
      'EM_DIAGNOSTICO',
      'ROLLBACK',
      'usuario-criador-1',
      'Orçamento recusado pelo cliente (autenticação por CPF)',
    );
  });

  it('lança 404 quando a OS não existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(CLIENTE_ID, OS_ID, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.transicionarStatus).not.toHaveBeenCalled();
  });

  it('lança 404 quando a OS pertence a outro cliente (sem vazar existência)', async () => {
    repo.findById.mockResolvedValue(ordemFake({ clienteId: 'outro-cliente' }));

    await expect(useCase.execute(CLIENTE_ID, OS_ID, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.transicionarStatus).not.toHaveBeenCalled();
  });

  it('lança 409 quando a OS não está em AGUARDANDO_APROVACAO', async () => {
    repo.findById.mockResolvedValue(
      ordemFake({ status: 'EM_EXECUCAO' as StatusOrdemServico }),
    );

    await expect(useCase.execute(CLIENTE_ID, OS_ID, true)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.transicionarStatus).not.toHaveBeenCalled();
  });
});
