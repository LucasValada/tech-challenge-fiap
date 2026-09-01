import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicOrdemServicoController } from './public-ordem-servico.controller';
import { ConsultarOrdemServicoPublicaUseCase } from '../../application/use-case/consultar-ordem-servico-publica.use-case';

const CODIGO = 'OS-2026-000001';
const PLACA = 'ABC1D23';

const viewMock = {
  codigo: CODIGO,
  status: 'AGUARDANDO_APROVACAO',
  valorTotal: 100,
} as never;

const mockConsultar = { execute: jest.fn() };

describe('PublicOrdemServicoController', () => {
  let controller: PublicOrdemServicoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PublicOrdemServicoController],
      providers: [
        {
          provide: ConsultarOrdemServicoPublicaUseCase,
          useValue: mockConsultar,
        },
      ],
    }).compile();

    controller = moduleRef.get(PublicOrdemServicoController);
    jest.clearAllMocks();
  });

  describe('GET /:codigo', () => {
    it('delega para ConsultarOrdemServicoPublicaUseCase com código e placa', async () => {
      mockConsultar.execute.mockResolvedValue(viewMock);

      const result = await controller.consultar(CODIGO, PLACA);

      expect(result).toBe(viewMock);
      expect(mockConsultar.execute).toHaveBeenCalledWith(CODIGO, PLACA);
    });

    it('lança BadRequestException quando placa não é informada', async () => {
      await expect(controller.consultar(CODIGO, undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockConsultar.execute).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando placa é string vazia', async () => {
      await expect(controller.consultar(CODIGO, '   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockConsultar.execute).not.toHaveBeenCalled();
    });

    it('propaga NotFoundException do use case', async () => {
      mockConsultar.execute.mockRejectedValue(
        new NotFoundException('Ordem de serviço não encontrada'),
      );

      await expect(controller.consultar(CODIGO, PLACA)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
