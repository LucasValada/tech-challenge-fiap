import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  const queryRaw = jest.fn();
  let logError: jest.SpyInstance;
  const controller = new HealthController({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  it('liveness responde ok sem consultar o banco', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('readiness responde ok quando o banco responde', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('readiness responde 503 genérico quando o banco não responde', async () => {
    queryRaw.mockRejectedValue(new Error('senha inválida para o usuário app'));

    const erro = await controller.ready().catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    const corpo = (erro as ServiceUnavailableException).getResponse();
    expect(corpo).toEqual({ status: 'error', database: 'down' });
    // O detalhe do erro vai só para o log, nunca para a resposta pública.
    expect(JSON.stringify(corpo)).not.toContain('senha');
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('senha inválida'),
    );
  });

  it('readiness registra erros que não são Error', async () => {
    queryRaw.mockRejectedValue('timeout');

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('timeout'));
  });
});
