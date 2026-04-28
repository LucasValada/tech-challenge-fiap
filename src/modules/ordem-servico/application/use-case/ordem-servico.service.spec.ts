import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrdemServicoService } from './ordem-servico.service';
import { ORDEM_SERVICO_REPOSITORY } from '../../domain/repository/ordem-servico.repository';
import { VeiculoRepository } from '../../../veiculo/veiculo.repository';
import { ServicoRepository } from '../../../servico/servico.repository';
import { ITEM_ESTOQUE_REPOSITORY } from '../../../item-estoque/domain/repository/item-estoque.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import {
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  OSImutavelError,
  ServicoIndisponivelError,
  TransicaoInvalidaError,
  VeiculoNaoPertenceAoClienteError,
} from '../../domain/errors';

const mockOrdemRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdComDetalhes: jest.fn(),
  findByCodigo: jest.fn(),
  findPublicByCodigoEPlaca: jest.fn(),
  createComItens: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  adicionarServico: jest.fn(),
  removerServico: jest.fn(),
  atualizarQuantidadeServico: jest.fn(),
  adicionarItemEstoque: jest.fn(),
  removerItemEstoque: jest.fn(),
  atualizarQuantidadeItemEstoque: jest.fn(),
  transicionarStatus: jest.fn(),
  getRelatorioTempoMedioPorServico: jest.fn(),
};

const mockClientRepo = {
  getOne: jest.fn(),
  getAllClient: jest.fn(),
  createClient: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
};

const mockVeiculoRepo = {
  findByPlaca: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockServicoRepo = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockItemRepo = {
  findById: jest.fn(),
  findAll: jest.fn(),
  findBySku: jest.fn(),
  findBaixoEstoque: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const ordemRecebida = (): OrdemServico =>
  new OrdemServico(
    'cliente-1',
    'veiculo-1',
    'usuario-1',
    'RECEBIDA',
    null,
    0,
    0,
    0,
    'OS-2026-000001',
    'ordem-1',
    new Date(),
    new Date(),
    null,
    null,
  );

const ordemEmExecucao = (): OrdemServico => {
  const o = ordemRecebida();
  o.status = 'EM_EXECUCAO';
  return o;
};

describe('OrdemServicoService', () => {
  let service: OrdemServicoService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdemServicoService,
        { provide: ORDEM_SERVICO_REPOSITORY, useValue: mockOrdemRepo },
        { provide: 'CLIENT_REPOSITORY', useValue: mockClientRepo },
        { provide: VeiculoRepository, useValue: mockVeiculoRepo },
        { provide: ServicoRepository, useValue: mockServicoRepo },
        { provide: ITEM_ESTOQUE_REPOSITORY, useValue: mockItemRepo },
      ],
    }).compile();

    service = moduleRef.get(OrdemServicoService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const baseDto = {
      cpfCnpj: '123.456.789-00',
      placa: 'ABC1D23',
      observacoes: 'OS criada via balcão',
    };

    it('lança NotFoundException quando cpfCnpj não tem cliente', async () => {
      mockClientRepo.getByCpfCnpj.mockResolvedValue(null);

      await expect(service.create('usuario-1', baseDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockClientRepo.getByCpfCnpj).toHaveBeenCalledWith('12345678900');
      expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
    });

    it('lança UnprocessableEntityException quando veículo é de outro cliente', async () => {
      mockClientRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '12345678900',
      });
      mockVeiculoRepo.findByPlaca.mockResolvedValue({
        id: 'veiculo-1',
        clienteId: 'OUTRO-CLIENTE',
      });

      await expect(service.create('usuario-1', baseDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
    });

    it('cria OS no fluxo feliz com 1 servico e 1 item', async () => {
      mockClientRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '12345678900',
      });
      mockVeiculoRepo.findByPlaca.mockResolvedValue({
        id: 'veiculo-1',
        clienteId: 'cliente-1',
      });
      const ordemCriada = ordemRecebida();
      mockOrdemRepo.createComItens.mockResolvedValue(ordemCriada);

      const result = await service.create('usuario-1', {
        ...baseDto,
        servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
        itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
      });

      expect(result).toBe(ordemCriada);
      expect(mockOrdemRepo.createComItens).toHaveBeenCalledWith({
        clienteId: 'cliente-1',
        veiculoId: 'veiculo-1',
        usuarioCriadorId: 'usuario-1',
        observacoes: 'OS criada via balcão',
        servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
        itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
      });
    });
  });

  describe('transicionarStatus', () => {
    it('delega ao repo quando avanço linear é válido', async () => {
      const ordem = ordemRecebida();
      mockOrdemRepo.findById.mockResolvedValue(ordem);
      const ordemAtualizada = { ...ordem, status: 'EM_DIAGNOSTICO' };
      mockOrdemRepo.transicionarStatus.mockResolvedValue(ordemAtualizada);

      const result = await service.transicionarStatus('ordem-1', 'usuario-1', {
        status: 'EM_DIAGNOSTICO',
        observacao: 'iniciando diagnóstico',
      });

      expect(result).toBe(ordemAtualizada);
      expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
        'ordem-1',
        'EM_DIAGNOSTICO',
        'AVANCO',
        'usuario-1',
        'iniciando diagnóstico',
      );
    });

    it('lança ConflictException quando tenta pular passos', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());

      await expect(
        service.transicionarStatus('ordem-1', 'usuario-1', {
          status: 'FINALIZADA',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
    });
  });

  describe('adicionarServico', () => {
    it('lança ConflictException quando OS está em EM_EXECUCAO (imutável)', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.adicionarServico('ordem-1', { servicoId: 'svc-1', quantidade: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(mockOrdemRepo.adicionarServico).not.toHaveBeenCalled();
    });
  });

  describe('traduzirErroDominio', () => {
    const cenarios: Array<{
      nome: string;
      erro: Error;
      esperado: new (...args: any[]) => Error;
    }> = [
      {
        nome: 'ServicoIndisponivelError → 422',
        erro: new ServicoIndisponivelError('svc-x'),
        esperado: UnprocessableEntityException,
      },
      {
        nome: 'ItemEstoqueIndisponivelError → 422',
        erro: new ItemEstoqueIndisponivelError('item-x'),
        esperado: UnprocessableEntityException,
      },
      {
        nome: 'EstoqueInsuficienteError → 422',
        erro: new EstoqueInsuficienteError('Pastilha', 1, 5),
        esperado: UnprocessableEntityException,
      },
      {
        nome: 'LinhaNaoEncontradaError → 404',
        erro: new LinhaNaoEncontradaError('linha-x'),
        esperado: NotFoundException,
      },
      {
        nome: 'OSImutavelError → 409',
        erro: new OSImutavelError('FINALIZADA'),
        esperado: ConflictException,
      },
      {
        nome: 'TransicaoInvalidaError → 409',
        erro: new TransicaoInvalidaError('RECEBIDA', 'ENTREGUE'),
        esperado: ConflictException,
      },
      {
        nome: 'VeiculoNaoPertenceAoClienteError → 422',
        erro: new VeiculoNaoPertenceAoClienteError('ABC1D23', '12345678900'),
        esperado: UnprocessableEntityException,
      },
    ];

    for (const c of cenarios) {
      it(`mapeia ${c.nome}`, async () => {
        mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
        mockOrdemRepo.adicionarServico.mockRejectedValue(c.erro);

        await expect(
          service.adicionarServico('ordem-1', {
            servicoId: 'svc-1',
            quantidade: 1,
          }),
        ).rejects.toThrow(c.esperado);
      });
    }
  });
});
