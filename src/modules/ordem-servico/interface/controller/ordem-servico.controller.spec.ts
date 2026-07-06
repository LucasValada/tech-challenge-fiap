import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { OrdemServicoController } from './ordem-servico.controller';
import { GetAllOrdensServicoUseCase } from '../../application/use-case/get-all-ordens-servico.use-case';
import { GetOrdemServicoByIdUseCase } from '../../application/use-case/get-ordem-servico-by-id.use-case';
import { CreateOrdemServicoUseCase } from '../../application/use-case/create-ordem-servico.use-case';
import { UpdateOrdemServicoUseCase } from '../../application/use-case/update-ordem-servico.use-case';
import { DeleteOrdemServicoUseCase } from '../../application/use-case/delete-ordem-servico.use-case';
import { AdicionarServicoOSUseCase } from '../../application/use-case/adicionar-servico-os.use-case';
import { AtualizarQuantidadeServicoUseCase } from '../../application/use-case/atualizar-quantidade-servico.use-case';
import { RemoverServicoOSUseCase } from '../../application/use-case/remover-servico-os.use-case';
import { AdicionarItemEstoqueOSUseCase } from '../../application/use-case/adicionar-item-estoque-os.use-case';
import { AtualizarQuantidadeItemEstoqueUseCase } from '../../application/use-case/atualizar-quantidade-item-estoque.use-case';
import { RemoverItemEstoqueOSUseCase } from '../../application/use-case/remover-item-estoque-os.use-case';
import { EnviarOrcamentoUseCase } from '../../application/use-case/enviar-orcamento.use-case';
import { TransicionarStatusUseCase } from '../../application/use-case/transicionar-status.use-case';
import { AuthenticatedUser } from '../../../auth/domain/types';

const mock = () => ({ execute: jest.fn() });

const getAll = mock();
const getById = mock();
const create = mock();
const update = mock();
const remove = mock();
const adicionarServico = mock();
const atualizarQtdServico = mock();
const removerServico = mock();
const adicionarItem = mock();
const atualizarQtdItem = mock();
const removerItem = mock();
const enviarOrcamento = mock();
const transicionarStatus = mock();

const fakeRequest = (
  userId = 'usuario-1',
): Request & { user: AuthenticatedUser } =>
  ({
    user: { id: userId, email: 'mecanico@oficina.com', nome: 'Mec' },
  }) as unknown as Request & { user: AuthenticatedUser };

describe('OrdemServicoController', () => {
  let controller: OrdemServicoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrdemServicoController],
      providers: [
        { provide: GetAllOrdensServicoUseCase, useValue: getAll },
        { provide: GetOrdemServicoByIdUseCase, useValue: getById },
        { provide: CreateOrdemServicoUseCase, useValue: create },
        { provide: UpdateOrdemServicoUseCase, useValue: update },
        { provide: DeleteOrdemServicoUseCase, useValue: remove },
        { provide: AdicionarServicoOSUseCase, useValue: adicionarServico },
        {
          provide: AtualizarQuantidadeServicoUseCase,
          useValue: atualizarQtdServico,
        },
        { provide: RemoverServicoOSUseCase, useValue: removerServico },
        { provide: AdicionarItemEstoqueOSUseCase, useValue: adicionarItem },
        {
          provide: AtualizarQuantidadeItemEstoqueUseCase,
          useValue: atualizarQtdItem,
        },
        { provide: RemoverItemEstoqueOSUseCase, useValue: removerItem },
        { provide: EnviarOrcamentoUseCase, useValue: enviarOrcamento },
        { provide: TransicionarStatusUseCase, useValue: transicionarStatus },
      ],
    }).compile();

    controller = moduleRef.get(OrdemServicoController);
    jest.clearAllMocks();
  });

  it('GET /ordens-servico → GetAllOrdensServicoUseCase', async () => {
    getAll.execute.mockResolvedValue({ ordens: [], count: 0 });
    const result = await controller.findAll();
    expect(result).toEqual({ ordens: [], count: 0 });
    expect(getAll.execute).toHaveBeenCalled();
  });

  it('GET /ordens-servico/:id → GetOrdemServicoByIdUseCase', async () => {
    const detalhe = { id: 'ordem-1', codigo: 'OS-2026-000001' };
    getById.execute.mockResolvedValue(detalhe);
    const result = await controller.findById('ordem-1');
    expect(result).toBe(detalhe);
    expect(getById.execute).toHaveBeenCalledWith('ordem-1');
  });

  it('POST /ordens-servico → create com user.id do JWT', async () => {
    const dto = { cpfCnpj: '529.982.247-25', placa: 'ABC1D23' };
    const ordemCriada = { id: 'ordem-1', codigo: 'OS-2026-000001' };
    create.execute.mockResolvedValue(ordemCriada);

    const result = await controller.create(fakeRequest('usuario-x'), dto);

    expect(result).toBe(ordemCriada);
    expect(create.execute).toHaveBeenCalledWith('usuario-x', dto);
  });

  it('PUT /ordens-servico/:id → update', async () => {
    const dto = { observacoes: 'novo' };
    update.execute.mockResolvedValue({ id: 'ordem-1' });
    await controller.update('ordem-1', dto);
    expect(update.execute).toHaveBeenCalledWith('ordem-1', dto);
  });

  it('DELETE /ordens-servico/:id → delete', async () => {
    remove.execute.mockResolvedValue(undefined);
    await controller.delete('ordem-1');
    expect(remove.execute).toHaveBeenCalledWith('ordem-1');
  });

  it('POST /:id/servicos → adicionarServico', async () => {
    const dto = { servicoId: 'svc-1', quantidade: 2 };
    adicionarServico.execute.mockResolvedValue({ id: 'linha-1' });
    const result = await controller.adicionarServico('ordem-1', dto);
    expect(result).toEqual({ id: 'linha-1' });
    expect(adicionarServico.execute).toHaveBeenCalledWith('ordem-1', dto);
  });

  it('PUT /:id/servicos/:linhaId → atualizarQuantidadeServico', async () => {
    atualizarQtdServico.execute.mockResolvedValue({ id: 'linha-1' });
    await controller.atualizarQuantidadeServico('ordem-1', 'linha-1', {
      quantidade: 3,
    });
    expect(atualizarQtdServico.execute).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
      3,
    );
  });

  it('DELETE /:id/servicos/:linhaId → removerServico', async () => {
    removerServico.execute.mockResolvedValue(undefined);
    await controller.removerServico('ordem-1', 'linha-1');
    expect(removerServico.execute).toHaveBeenCalledWith('ordem-1', 'linha-1');
  });

  it('POST /:id/itens-estoque → adicionarItemEstoque', async () => {
    const dto = { itemEstoqueId: 'item-1', quantidade: 5 };
    adicionarItem.execute.mockResolvedValue({ id: 'linha-2' });
    const result = await controller.adicionarItemEstoque('ordem-1', dto);
    expect(result).toEqual({ id: 'linha-2' });
    expect(adicionarItem.execute).toHaveBeenCalledWith('ordem-1', dto);
  });

  it('PUT /:id/itens-estoque/:linhaId → atualizarQuantidadeItemEstoque', async () => {
    atualizarQtdItem.execute.mockResolvedValue({ id: 'linha-2' });
    await controller.atualizarQuantidadeItemEstoque('ordem-1', 'linha-2', {
      quantidade: 4,
    });
    expect(atualizarQtdItem.execute).toHaveBeenCalledWith(
      'ordem-1',
      'linha-2',
      4,
    );
  });

  it('DELETE /:id/itens-estoque/:linhaId → removerItemEstoque', async () => {
    removerItem.execute.mockResolvedValue(undefined);
    await controller.removerItemEstoque('ordem-1', 'linha-2');
    expect(removerItem.execute).toHaveBeenCalledWith('ordem-1', 'linha-2');
  });

  it('POST /:id/enviar-orcamento → enviarOrcamento com user.id', async () => {
    enviarOrcamento.execute.mockResolvedValue({ id: 'ordem-1' });
    await controller.enviarOrcamento(fakeRequest('usuario-z'), 'ordem-1');
    expect(enviarOrcamento.execute).toHaveBeenCalledWith(
      'ordem-1',
      'usuario-z',
    );
  });

  it('POST /:id/transicao-status → transicionarStatus com user.id', async () => {
    const dto = { status: 'EM_DIAGNOSTICO' as const };
    transicionarStatus.execute.mockResolvedValue({ id: 'ordem-1' });
    await controller.transicionarStatus(
      fakeRequest('usuario-y'),
      'ordem-1',
      dto,
    );
    expect(transicionarStatus.execute).toHaveBeenCalledWith(
      'ordem-1',
      'usuario-y',
      dto,
    );
  });
});
