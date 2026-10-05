import { TelemetriaShutdown } from './telemetria-shutdown';
import { encerrarAgente } from './newrelic';

jest.mock('./newrelic', () => ({
  encerrarAgente: jest.fn().mockResolvedValue(undefined),
}));

describe('TelemetriaShutdown', () => {
  it('envia o que o agente tem em memória ao desligar a aplicação', async () => {
    await new TelemetriaShutdown().onApplicationShutdown();

    expect(encerrarAgente).toHaveBeenCalledTimes(1);
  });
});
