jest.mock('../shared/telemetria-ordem-servico', () => ({
  registrarOrdemCriada: jest.fn(),
  registrarFalhaOrdemServico: jest.fn(),
  registrarRejeicaoOrdemServico: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrdemServicoUseCase } from './create-ordem-servico.use-case';
import { ServicoIndisponivelError } from '../../domain/errors';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { PUBLICADOR_COMANDOS } from '../saga/mensagens-saga';
import {
  registrarFalhaOrdemServico,
  registrarOrdemCriada,
  registrarRejeicaoOrdemServico,
} from '../shared/telemetria-ordem-servico';

const mockOrdemRepo = { createComItens: jest.fn() };
const mockClienteRepo = { findByCpfCnpj: jest.fn() };
const mockVeiculoRepo = { findByPlaca: jest.fn() };
const mockPublicador = { publicar: jest.fn() };

const baseDto = {
  cpfCnpj: '529.982.247-25',
  placa: 'ABC1D23',
  observacoes: 'OS criada via balcão',
};

describe('CreateOrdemServicoUseCase', () => {
  let useCase: CreateOrdemServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrdemServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
        { provide: 'CLIENTE_REPOSITORY', useValue: mockClienteRepo },
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepo },
        { provide: PUBLICADOR_COMANDOS, useValue: mockPublicador },
      ],
    }).compile();

    useCase = moduleRef.get(CreateOrdemServicoUseCase);
    jest.clearAllMocks();
  });

  it('lança NotFoundException quando cpfCnpj não tem cliente', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue(null);

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockClienteRepo.findByCpfCnpj).toHaveBeenCalledWith('52998224725');
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('sem correlationId da requisição, a OS ganha um próprio', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    mockOrdemRepo.createComItens.mockResolvedValue({ id: 'ordem-1' });

    await useCase.execute('usuario-1', baseDto);

    expect(mockOrdemRepo.createComItens).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
      }),
      expect.any(Function),
    );
  });

  it('lança NotFoundException quando veículo não encontrado', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue(null);

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('lança UnprocessableEntityException quando veículo é de outro cliente', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'OUTRO-CLIENTE',
    });

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('traduz erro de domínio quando createComItens lança', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
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

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );

    // Regra de negócio recusando o pedido não é falha do sistema: não pode
    // alimentar o alerta de falhas.
    expect(registrarRejeicaoOrdemServico).toHaveBeenCalledWith(
      'criacao',
      expect.any(ServicoIndisponivelError),
      { cliente_id: 'cliente-1', veiculo_id: 'veiculo-1' },
    );
    expect(registrarFalhaOrdemServico).not.toHaveBeenCalled();
  });

  it('erro sem tradução (banco fora) conta como falha e é repassado intacto', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    const erroDeBanco = new Error('connect ECONNREFUSED');
    mockOrdemRepo.createComItens.mockRejectedValue(erroDeBanco);

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBe(
      erroDeBanco,
    );
    expect(registrarFalhaOrdemServico).toHaveBeenCalledWith(
      'criacao',
      erroDeBanco,
      { cliente_id: 'cliente-1', veiculo_id: 'veiculo-1' },
    );
    expect(registrarRejeicaoOrdemServico).not.toHaveBeenCalled();
    expect(registrarOrdemCriada).not.toHaveBeenCalled();
  });

  it('cria OS no fluxo feliz com 1 serviço e 1 item', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    const ordemCriada = { id: 'ordem-1' };
    mockOrdemRepo.createComItens.mockResolvedValue(ordemCriada);

    const result = await useCase.execute(
      'usuario-1',
      {
        ...baseDto,
        servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
        itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
      },
      'fluxo-da-os',
    );

    expect(result).toBe(ordemCriada);
    expect(mockOrdemRepo.createComItens).toHaveBeenCalledWith(
      {
        correlationId: 'fluxo-da-os',
        clienteId: 'cliente-1',
        veiculoId: 'veiculo-1',
        usuarioCriadorId: 'usuario-1',
        observacoes: 'OS criada via balcão',
        servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
        itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
      },
      expect.any(Function),
    );
    expect(registrarOrdemCriada).toHaveBeenCalledWith(
      expect.objectContaining({
        ordemId: 'ordem-1',
        quantidadeServicos: 1,
        quantidadeItens: 1,
      }),
    );
  });

  it('a abertura publica IniciarDiagnostico, dentro da transação, com o veículo e o fluxo da OS', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({ id: 'cliente-1' });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
      placa: 'ABC1D23',
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
    });
    const criada = new OrdemServico(
      'cliente-1',
      'veiculo-1',
      'usuario-1',
      'RECEBIDA',
      'Barulho no motor',
      0,
      0,
      0,
      'OS-2026-000001',
      'ordem-1',
    );
    criada.correlationId = 'fluxo-da-os';
    mockOrdemRepo.createComItens.mockImplementation(
      async (
        _dados: unknown,
        antesDoCommit: (o: OrdemServico) => Promise<void>,
      ) => {
        await antesDoCommit(criada);
        return criada;
      },
    );
    mockPublicador.publicar.mockResolvedValue(undefined);

    await useCase.execute('usuario-1', baseDto, 'fluxo-da-os');

    expect(mockPublicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'IniciarDiagnostico',
        osId: 'ordem-1',
        correlationId: 'fluxo-da-os',
        payload: {
          codigo: 'OS-2026-000001',
          veiculo: {
            placa: 'ABC1D23',
            marca: 'Fiat',
            modelo: 'Uno',
            ano: 2020,
          },
          observacoes: 'Barulho no motor',
        },
      }),
    );
  });

  it('se a publicação falha, a abertura falha (a OS não fica parada sem ninguém saber)', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({ id: 'cliente-1' });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    mockOrdemRepo.createComItens.mockRejectedValue(new Error('SQS fora'));

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toThrow(
      'SQS fora',
    );
    expect(registrarFalhaOrdemServico).toHaveBeenCalled();
  });
});
