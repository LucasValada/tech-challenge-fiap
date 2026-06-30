import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrdemServicoService } from './ordem-servico.service';
import { ORDEM_SERVICO_REPOSITORY } from '../../domain/repository/ordem-servico.repository';
import { SERVICO_REPOSITORY } from '../../../servico/domain/repository/servico.repository';
import { ITEM_ESTOQUE_REPOSITORY } from '../../../item-estoque/domain/repository/item-estoque.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import {
  ClienteNaoEncontradoError,
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  OSImutavelError,
  ServicoIndisponivelError,
  TransicaoInvalidaError,
  VeiculoNaoEncontradoError,
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
  contarLinhas: jest.fn(),
  findByCodigoEPlaca: jest.fn(),
  getRelatorioTempoMedioPorServico: jest.fn(),
};

const mockClienteRepo = {
  getOne: jest.fn(),
  getAllCliente: jest.fn(),
  createCliente: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateCliente: jest.fn(),
  deleteCliente: jest.fn(),
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

const mockEmailSender = {
  enviarOrcamento: jest.fn(),
  enviarNotificacaoFinalizacao: jest.fn(),
  enviarNotificacaoEntrega: jest.fn(),
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
        { provide: 'CLIENTE_REPOSITORY', useValue: mockClienteRepo },
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepo },
        { provide: SERVICO_REPOSITORY, useValue: mockServicoRepo },
        { provide: ITEM_ESTOQUE_REPOSITORY, useValue: mockItemRepo },
        { provide: 'EMAIL_SENDER', useValue: mockEmailSender },
      ],
    }).compile();

    service = moduleRef.get(OrdemServicoService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('retorna lista de ordens', async () => {
      const resultado = { ordens: [ordemRecebida()], count: 1 };
      mockOrdemRepo.findAll.mockResolvedValue(resultado);

      const result = await service.findAll();

      expect(result).toBe(resultado);
    });
  });

  describe('findById', () => {
    it('retorna ordem quando encontrada', async () => {
      const ordem = ordemRecebida();
      mockOrdemRepo.findById.mockResolvedValue(ordem);

      const result = await service.findById('ordem-1');

      expect(result).toBe(ordem);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      mockOrdemRepo.findById.mockResolvedValue(null);

      await expect(service.findById('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdComDetalhes', () => {
    it('lança NotFoundException quando não encontrada', async () => {
      mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(null);

      await expect(service.findByIdComDetalhes('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('atualiza observações da OS', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      const ordemAtualizada = ordemRecebida();
      mockOrdemRepo.update.mockResolvedValue(ordemAtualizada);

      const result = await service.update('ordem-1', {
        observacoes: 'nova obs',
      });

      expect(result).toBe(ordemAtualizada);
      expect(mockOrdemRepo.update).toHaveBeenCalledWith('ordem-1', {
        observacoes: 'nova obs',
      });
    });
  });

  describe('delete', () => {
    it('deleta OS existente', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      mockOrdemRepo.delete.mockResolvedValue(undefined);

      await service.delete('ordem-1');

      expect(mockOrdemRepo.delete).toHaveBeenCalledWith('ordem-1');
    });
  });

  describe('create', () => {
    const baseDto = {
      cpfCnpj: '529.982.247-25',
      placa: 'ABC1D23',
      observacoes: 'OS criada via balcão',
    };

    it('lança NotFoundException quando cpfCnpj não tem cliente', async () => {
      mockClienteRepo.getByCpfCnpj.mockResolvedValue(null);

      await expect(service.create('usuario-1', baseDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockClienteRepo.getByCpfCnpj).toHaveBeenCalledWith('52998224725');
      expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
    });

    it('lança UnprocessableEntityException quando veículo é de outro cliente', async () => {
      mockClienteRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '52998224725',
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

    it('lança NotFoundException quando veículo não encontrado', async () => {
      mockClienteRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '52998224725',
      });
      mockVeiculoRepo.findByPlaca.mockResolvedValue(null);

      await expect(service.create('usuario-1', baseDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
    });

    it('traduz erro de domínio quando createComItens lança', async () => {
      mockClienteRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '52998224725',
      });
      mockVeiculoRepo.findByPlaca.mockResolvedValue({
        id: 'veiculo-1',
        clienteId: 'cliente-1',
      });
      mockOrdemRepo.createComItens.mockRejectedValue(
        new ServicoIndisponivelError('svc-x'),
      );

      await expect(service.create('usuario-1', baseDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('cria OS no fluxo feliz com 1 servico e 1 item', async () => {
      mockClienteRepo.getByCpfCnpj.mockResolvedValue({
        id: 'cliente-1',
        cpfCnpj: '52998224725',
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

    describe('notificação por email', () => {
      const detalhesMinimos = {
        codigo: 'OS-2026-000001',
        cliente: { id: 'cliente-1', nome: 'João' },
        veiculo: { placa: 'ABC1D23' },
      } as unknown as OrdemServicoDetalhadaView;

      const mockTransicaoOk = (statusOrigem: OrdemServico['status']) => {
        const ordem = ordemRecebida();
        ordem.status = statusOrigem;
        mockOrdemRepo.findById.mockResolvedValue(ordem);
        mockOrdemRepo.transicionarStatus.mockResolvedValue(ordem);
        mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesMinimos);
      };

      it('dispara enviarNotificacaoFinalizacao em transição para FINALIZADA', async () => {
        mockTransicaoOk('EM_EXECUCAO');
        mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });

        await service.transicionarStatus('ordem-1', 'usuario-1', {
          status: 'FINALIZADA',
        });

        expect(mockEmailSender.enviarNotificacaoFinalizacao).toHaveBeenCalledWith(
          {
            clienteNome: 'João',
            clienteEmail: 'joao@email.com',
            codigoOS: 'OS-2026-000001',
            placa: 'ABC1D23',
          },
        );
        expect(mockEmailSender.enviarNotificacaoEntrega).not.toHaveBeenCalled();
      });

      it('dispara enviarNotificacaoEntrega em transição para ENTREGUE', async () => {
        mockTransicaoOk('FINALIZADA');
        mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });

        await service.transicionarStatus('ordem-1', 'usuario-1', {
          status: 'ENTREGUE',
        });

        expect(mockEmailSender.enviarNotificacaoEntrega).toHaveBeenCalledWith({
          clienteNome: 'João',
          clienteEmail: 'joao@email.com',
          codigoOS: 'OS-2026-000001',
          placa: 'ABC1D23',
        });
        expect(
          mockEmailSender.enviarNotificacaoFinalizacao,
        ).not.toHaveBeenCalled();
      });

      it('não dispara email em transições que não são FINALIZADA nem ENTREGUE', async () => {
        mockTransicaoOk('RECEBIDA');

        await service.transicionarStatus('ordem-1', 'usuario-1', {
          status: 'EM_DIAGNOSTICO',
        });

        expect(
          mockEmailSender.enviarNotificacaoFinalizacao,
        ).not.toHaveBeenCalled();
        expect(mockEmailSender.enviarNotificacaoEntrega).not.toHaveBeenCalled();
        expect(mockClienteRepo.getOne).not.toHaveBeenCalled();
      });

      it('não dispara email quando cliente não tem email cadastrado', async () => {
        mockTransicaoOk('EM_EXECUCAO');
        mockClienteRepo.getOne.mockResolvedValue({ email: null });

        await service.transicionarStatus('ordem-1', 'usuario-1', {
          status: 'FINALIZADA',
        });

        expect(
          mockEmailSender.enviarNotificacaoFinalizacao,
        ).not.toHaveBeenCalled();
      });

      it('falha silenciosamente no email sem bloquear a transição', async () => {
        mockTransicaoOk('EM_EXECUCAO');
        mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });
        mockEmailSender.enviarNotificacaoFinalizacao.mockRejectedValue(

          new Error('SMTP down'),
        );

        await expect(
          service.transicionarStatus('ordem-1', 'usuario-1', {
            status: 'FINALIZADA',
          }),
        ).resolves.toBeDefined();
      });
    });
  });

  describe('adicionarServico', () => {
    it('adiciona serviço quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      const linha = { id: 'linha-1', servicoId: 'svc-1', quantidade: 1 };
      mockOrdemRepo.adicionarServico.mockResolvedValue(linha);

      const result = await service.adicionarServico('ordem-1', {
        servicoId: 'svc-1',
        quantidade: 1,
      });

      expect(result).toBe(linha);
    });

    it('lança ConflictException quando OS está em EM_EXECUCAO (imutável)', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.adicionarServico('ordem-1', {
          servicoId: 'svc-1',
          quantidade: 1,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockOrdemRepo.adicionarServico).not.toHaveBeenCalled();
    });
  });

  describe('removerServico', () => {
    it('remove serviço quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      mockOrdemRepo.removerServico.mockResolvedValue(undefined);

      await service.removerServico('ordem-1', 'linha-1');

      expect(mockOrdemRepo.removerServico).toHaveBeenCalledWith(
        'ordem-1',
        'linha-1',
      );
    });

    it('lança ConflictException quando OS é imutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.removerServico('ordem-1', 'linha-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('atualizarQuantidadeServico', () => {
    it('atualiza quantidade quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      const linhaAtualizada = { id: 'linha-1', quantidade: 3 };
      mockOrdemRepo.atualizarQuantidadeServico.mockResolvedValue(
        linhaAtualizada,
      );

      const result = await service.atualizarQuantidadeServico(
        'ordem-1',
        'linha-1',
        3,
      );

      expect(result).toBe(linhaAtualizada);
    });

    it('lança ConflictException quando OS é imutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.atualizarQuantidadeServico('ordem-1', 'linha-1', 3),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('adicionarItemEstoque', () => {
    it('adiciona item quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      const linha = { id: 'linha-1', itemEstoqueId: 'item-1', quantidade: 2 };
      mockOrdemRepo.adicionarItemEstoque.mockResolvedValue(linha);

      const result = await service.adicionarItemEstoque('ordem-1', {
        itemEstoqueId: 'item-1',
        quantidade: 2,
      });

      expect(result).toBe(linha);
    });

    it('lança ConflictException quando OS é imutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.adicionarItemEstoque('ordem-1', {
          itemEstoqueId: 'item-1',
          quantidade: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removerItemEstoque', () => {
    it('remove item quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      mockOrdemRepo.removerItemEstoque.mockResolvedValue(undefined);

      await service.removerItemEstoque('ordem-1', 'linha-1');

      expect(mockOrdemRepo.removerItemEstoque).toHaveBeenCalledWith(
        'ordem-1',
        'linha-1',
      );
    });

    it('lança ConflictException quando OS é imutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.removerItemEstoque('ordem-1', 'linha-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('atualizarQuantidadeItemEstoque', () => {
    it('atualiza quantidade quando OS é mutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      const linhaAtualizada = { id: 'linha-1', quantidade: 5 };
      mockOrdemRepo.atualizarQuantidadeItemEstoque.mockResolvedValue(
        linhaAtualizada,
      );

      const result = await service.atualizarQuantidadeItemEstoque(
        'ordem-1',
        'linha-1',
        5,
      );

      expect(result).toBe(linhaAtualizada);
    });

    it('lança ConflictException quando OS é imutável', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemEmExecucao());

      await expect(
        service.atualizarQuantidadeItemEstoque('ordem-1', 'linha-1', 5),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('enviarOrcamento', () => {
    const ordemDiagnostico = (): OrdemServico => {
      const o = ordemRecebida();
      o.status = 'EM_DIAGNOSTICO';
      return o;
    };

    const detalhesView = {
      id: 'ordem-1',
      codigo: 'OS-2026-000001',
      status: 'AGUARDANDO_APROVACAO',
      observacoes: null,
      valorServicos: 100,
      valorPecas: 50,
      valorTotal: 150,
      createdAt: new Date(),
      updatedAt: new Date(),
      finalizadaAt: null,
      entregueAt: null,
      cliente: { id: 'cliente-1', nome: 'João', cpfCnpj: '52998224725' },
      veiculo: {
        id: 'veiculo-1',
        placa: 'ABC1D23',
        marca: 'VW',
        modelo: 'Gol',
        ano: 2020,
      },
      usuarioCriador: { id: 'usuario-1', nome: 'Admin' },
      servicos: [
        {
          id: 'linha-1',
          servicoId: 'svc-1',
          nomeSnapshot: 'Troca de óleo',
          precoUnitario: 100,
          quantidade: 1,
          subtotal: 100,
          createdAt: new Date(),
        },
      ],
      itens: [
        {
          id: 'linha-2',
          itemEstoqueId: 'item-1',
          nomeSnapshot: 'Filtro de óleo',
          precoUnitario: 50,
          quantidade: 1,
          subtotal: 50,
          createdAt: new Date(),
        },
      ],
      historicoStatus: [],
    };

    it('envia orçamento e retorna detalhes quando OS está em EM_DIAGNOSTICO com itens', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemDiagnostico());
      mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 1, itens: 0 });
      mockOrdemRepo.transicionarStatus.mockResolvedValue({});
      mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesView);
      mockClienteRepo.getOne.mockResolvedValue({
        email: 'joao@email.com',
      });
      mockEmailSender.enviarOrcamento.mockResolvedValue(undefined);

      const result = await service.enviarOrcamento('ordem-1', 'usuario-1');

      expect(result).toBe(detalhesView);
      expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
        'ordem-1',
        'AGUARDANDO_APROVACAO',
        'AVANCO',
        'usuario-1',
        'Orçamento enviado para aprovação do cliente',
      );
      expect(mockEmailSender.enviarOrcamento).toHaveBeenCalled();
    });

    it('não envia email quando cliente não tem email', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemDiagnostico());
      mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 1, itens: 0 });
      mockOrdemRepo.transicionarStatus.mockResolvedValue({});
      mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesView);
      mockClienteRepo.getOne.mockResolvedValue({ email: null });

      await service.enviarOrcamento('ordem-1', 'usuario-1');

      expect(mockEmailSender.enviarOrcamento).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando OS não está em EM_DIAGNOSTICO', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());

      await expect(
        service.enviarOrcamento('ordem-1', 'usuario-1'),
      ).rejects.toThrow(ConflictException);
      expect(mockOrdemRepo.contarLinhas).not.toHaveBeenCalled();
    });

    it('lança UnprocessableEntityException quando OS não tem serviços nem itens', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemDiagnostico());
      mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 0, itens: 0 });

      await expect(
        service.enviarOrcamento('ordem-1', 'usuario-1'),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
    });
  });

  describe('traduzirErroDominio', () => {
    const cenarios: Array<{
      nome: string;
      erro: Error;
      esperado: new (...args: any[]) => Error;
    }> = [
      {
        nome: 'ClienteNaoEncontradoError → 404',
        erro: new ClienteNaoEncontradoError('52998224725'),
        esperado: NotFoundException,
      },
      {
        nome: 'VeiculoNaoEncontradoError → 404',
        erro: new VeiculoNaoEncontradoError('ABC1D23'),
        esperado: NotFoundException,
      },
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
        erro: new VeiculoNaoPertenceAoClienteError('ABC1D23', '52998224725'),
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

    it('repassa erro desconhecido como Error genérico', async () => {
      mockOrdemRepo.findById.mockResolvedValue(ordemRecebida());
      mockOrdemRepo.adicionarServico.mockRejectedValue('string error');

      await expect(
        service.adicionarServico('ordem-1', {
          servicoId: 'svc-1',
          quantidade: 1,
        }),
      ).rejects.toThrow(Error);
    });
  });
});
