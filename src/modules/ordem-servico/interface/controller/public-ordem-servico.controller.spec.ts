import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PublicOrdemServicoController } from './public-ordem-servico.controller';
import { ConsultarOrdemServicoPublicaUseCase } from '../../application/use-case/consultar-ordem-servico-publica.use-case';
import { AprovarOrcamentoPublicoUseCase } from '../../application/use-case/aprovar-orcamento-publico.use-case';

const CODIGO = 'OS-2026-000001';
const PLACA = 'ABC1D23';

const viewMock = {
  codigo: CODIGO,
  status: 'AGUARDANDO_APROVACAO',
  valorTotal: 100,
} as never;

const mockConsultar = { execute: jest.fn() };
const mockAprovar = { execute: jest.fn() };

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
        {
          provide: AprovarOrcamentoPublicoUseCase,
          useValue: mockAprovar,
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

  describe('POST /:codigo/aprovar', () => {
    it('delega para AprovarOrcamentoPublicoUseCase com código e placa do body', async () => {
      mockAprovar.execute.mockResolvedValue(viewMock);

      const result = await controller.aprovarOrcamento(CODIGO, { placa: PLACA });

      expect(result).toBe(viewMock);
      expect(mockAprovar.execute).toHaveBeenCalledWith(CODIGO, PLACA);
    });

    it('propaga ConflictException do use case (status inválido)', async () => {
      mockAprovar.execute.mockRejectedValue(
        new ConflictException('OS não está em AGUARDANDO_APROVACAO'),
      );

      await expect(
        controller.aprovarOrcamento(CODIGO, { placa: PLACA }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
