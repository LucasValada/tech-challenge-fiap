import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { OrdemServicoController } from './ordem-servico.controller';
import { OrdemServicoService } from '../../application/use-case/ordem-servico.service';
import { AuthenticatedUser } from '../../../auth/domain/types';

const mockOrdemServicoService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdComDetalhes: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  adicionarServico: jest.fn(),
  removerServico: jest.fn(),
  atualizarQuantidadeServico: jest.fn(),
  adicionarItemEstoque: jest.fn(),
  removerItemEstoque: jest.fn(),
  atualizarQuantidadeItemEstoque: jest.fn(),
  transicionarStatus: jest.fn(),
};

const fakeRequest = (
  userId = 'usuario-1',
): Request & { user: AuthenticatedUser } =>
  ({
    user: { id: userId, email: 'mecanico@oficina.com', nome: 'Mec' },
  }) as Request & { user: AuthenticatedUser };

describe('OrdemServicoController', () => {
  let controller: OrdemServicoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrdemServicoController],
      providers: [
        { provide: OrdemServicoService, useValue: mockOrdemServicoService },
      ],
    }).compile();

    controller = moduleRef.get(OrdemServicoController);
    jest.clearAllMocks();
  });

  it('GET /ordens-servico → findAll', async () => {
    mockOrdemServicoService.findAll.mockResolvedValue({
      ordens: [],
      count: 0,
    });
    const result = await controller.findAll();
    expect(result).toEqual({ ordens: [], count: 0 });
    expect(mockOrdemServicoService.findAll).toHaveBeenCalled();
  });

  it('GET /ordens-servico/:id → findByIdComDetalhes', async () => {
    const detalhe = { id: 'ordem-1', codigo: 'OS-2026-000001' };
    mockOrdemServicoService.findByIdComDetalhes.mockResolvedValue(detalhe);
    const result = await controller.findById('ordem-1');
    expect(result).toBe(detalhe);
    expect(mockOrdemServicoService.findByIdComDetalhes).toHaveBeenCalledWith(
      'ordem-1',
    );
  });

  it('POST /ordens-servico → create com user.id do JWT', async () => {
    const dto = {
      cpfCnpj: '529.982.247-25',
      placa: 'ABC1D23',
    };
    const ordemCriada = { id: 'ordem-1', codigo: 'OS-2026-000001' };
    mockOrdemServicoService.create.mockResolvedValue(ordemCriada);

    const result = await controller.create(fakeRequest('usuario-x'), dto);

    expect(result).toBe(ordemCriada);
    expect(mockOrdemServicoService.create).toHaveBeenCalledWith(
      'usuario-x',
      dto,
    );
  });

  it('PUT /ordens-servico/:id → update', async () => {
    const dto = { observacoes: 'novo' };
    mockOrdemServicoService.update.mockResolvedValue({ id: 'ordem-1' });
    await controller.update('ordem-1', dto);
    expect(mockOrdemServicoService.update).toHaveBeenCalledWith('ordem-1', dto);
  });

  it('DELETE /ordens-servico/:id → delete', async () => {
    mockOrdemServicoService.delete.mockResolvedValue(undefined);
    await controller.delete('ordem-1');
    expect(mockOrdemServicoService.delete).toHaveBeenCalledWith('ordem-1');
  });

  it('POST /:id/servicos → adicionarServico', async () => {
    const dto = { servicoId: 'svc-1', quantidade: 2 };
    mockOrdemServicoService.adicionarServico.mockResolvedValue({
      id: 'linha-1',
    });
    const result = await controller.adicionarServico('ordem-1', dto);
    expect(result).toEqual({ id: 'linha-1' });
    expect(mockOrdemServicoService.adicionarServico).toHaveBeenCalledWith(
      'ordem-1',
      dto,
    );
  });

  it('PUT /:id/servicos/:linhaId → atualizarQuantidadeServico', async () => {
    mockOrdemServicoService.atualizarQuantidadeServico.mockResolvedValue({
      id: 'linha-1',
      quantidade: 3,
    });
    await controller.atualizarQuantidadeServico('ordem-1', 'linha-1', {
      quantidade: 3,
    });
    expect(
      mockOrdemServicoService.atualizarQuantidadeServico,
    ).toHaveBeenCalledWith('ordem-1', 'linha-1', 3);
  });

  it('DELETE /:id/servicos/:linhaId → removerServico', async () => {
    mockOrdemServicoService.removerServico.mockResolvedValue(undefined);
    await controller.removerServico('ordem-1', 'linha-1');
    expect(mockOrdemServicoService.removerServico).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
    );
  });

  it('POST /:id/itens-estoque → adicionarItemEstoque', async () => {
    const dto = { itemEstoqueId: 'item-1', quantidade: 5 };
    mockOrdemServicoService.adicionarItemEstoque.mockResolvedValue({
      id: 'linha-2',
    });
    const result = await controller.adicionarItemEstoque('ordem-1', dto);
    expect(result).toEqual({ id: 'linha-2' });
    expect(mockOrdemServicoService.adicionarItemEstoque).toHaveBeenCalledWith(
      'ordem-1',
      dto,
    );
  });

  it('PUT /:id/itens-estoque/:linhaId → atualizarQuantidadeItemEstoque', async () => {
    mockOrdemServicoService.atualizarQuantidadeItemEstoque.mockResolvedValue({
      id: 'linha-2',
      quantidade: 4,
    });
    await controller.atualizarQuantidadeItemEstoque('ordem-1', 'linha-2', {
      quantidade: 4,
    });
    expect(
      mockOrdemServicoService.atualizarQuantidadeItemEstoque,
    ).toHaveBeenCalledWith('ordem-1', 'linha-2', 4);
  });

  it('DELETE /:id/itens-estoque/:linhaId → removerItemEstoque', async () => {
    mockOrdemServicoService.removerItemEstoque.mockResolvedValue(undefined);
    await controller.removerItemEstoque('ordem-1', 'linha-2');
    expect(mockOrdemServicoService.removerItemEstoque).toHaveBeenCalledWith(
      'ordem-1',
      'linha-2',
    );
  });

  it('POST /:id/transicao-status → transicionarStatus com user.id', async () => {
    const dto = { status: 'EM_DIAGNOSTICO' as const };
    mockOrdemServicoService.transicionarStatus.mockResolvedValue({
      id: 'ordem-1',
      status: 'EM_DIAGNOSTICO',
    });
    await controller.transicionarStatus(
      fakeRequest('usuario-y'),
      'ordem-1',
      dto,
    );
    expect(mockOrdemServicoService.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'usuario-y',
      dto,
    );
  });
});
