const agenteFalso = {
  getLinkingMetadata: jest.fn(),
  incrementMetric: jest.fn(),
  recordMetric: jest.fn(),
  noticeError: jest.fn(),
  shutdown: jest.fn(),
};

jest.mock('newrelic', () => agenteFalso);

import {
  encerrarAgente,
  incrementarMetrica,
  metadadosDeTrace,
  notificarErro,
  redefinirAgenteParaTestes,
  registrarMetrica,
} from './newrelic';

describe('helpers do agente New Relic', () => {
  const ambienteOriginal = process.env.NEW_RELIC_ENABLED;

  afterEach(() => {
    process.env.NEW_RELIC_ENABLED = ambienteOriginal;
    redefinirAgenteParaTestes();
    jest.clearAllMocks();
  });

  describe('com o agente desligado', () => {
    beforeEach(() => {
      delete process.env.NEW_RELIC_ENABLED;
      redefinirAgenteParaTestes();
    });

    it('não chama nada no agente', async () => {
      incrementarMetrica('OrdemServico/Criada');
      registrarMetrica('OrdemServico/TempoNoStatus/RECEBIDA', 10);
      notificarErro(new Error('x'));
      await encerrarAgente();

      expect(metadadosDeTrace()).toEqual({});
      expect(agenteFalso.incrementMetric).not.toHaveBeenCalled();
      expect(agenteFalso.recordMetric).not.toHaveBeenCalled();
      expect(agenteFalso.noticeError).not.toHaveBeenCalled();
      expect(agenteFalso.shutdown).not.toHaveBeenCalled();
    });
  });

  describe('com o agente ligado', () => {
    beforeEach(() => {
      process.env.NEW_RELIC_ENABLED = 'true';
      redefinirAgenteParaTestes();
    });

    it('passa o nome SEM o prefixo Custom/ (o agente acrescenta)', () => {
      incrementarMetrica('OrdemServico/Criada');

      expect(agenteFalso.incrementMetric).toHaveBeenCalledWith(
        'OrdemServico/Criada',
        1,
      );
    });

    it('registra amostra numérica e descarta valor não finito', () => {
      registrarMetrica('OrdemServico/TempoNoStatus/RECEBIDA', 42);
      registrarMetrica('OrdemServico/TempoNoStatus/RECEBIDA', Number.NaN);

      expect(agenteFalso.recordMetric).toHaveBeenCalledTimes(1);
      expect(agenteFalso.recordMetric).toHaveBeenCalledWith(
        'OrdemServico/TempoNoStatus/RECEBIDA',
        42,
      );
    });

    it('embrulha em Error o que não é Error antes do noticeError', () => {
      notificarErro('timeout', { etapa: 'criacao' });

      const [erro, atributos] = agenteFalso.noticeError.mock.calls[0] as [
        Error,
        Record<string, unknown>,
      ];
      expect(erro).toBeInstanceOf(Error);
      expect(erro.message).toBe('timeout');
      expect(atributos).toEqual({ etapa: 'criacao' });
    });

    it('pede metadados sem a métrica de supportability', () => {
      agenteFalso.getLinkingMetadata.mockReturnValue({ 'trace.id': 'abc' });

      expect(metadadosDeTrace()).toEqual({ 'trace.id': 'abc' });
      expect(agenteFalso.getLinkingMetadata).toHaveBeenCalledWith(true);
    });

    it('exceção do agente não chega ao chamador', () => {
      agenteFalso.incrementMetric.mockImplementationOnce(() => {
        throw new Error('agente quebrado');
      });

      expect(() => incrementarMetrica('OrdemServico/Criada')).not.toThrow();
    });

    it('encerrarAgente descarrega o buffer e resolve no callback', async () => {
      agenteFalso.shutdown.mockImplementation(
        (_opcoes: unknown, callback: () => void) => callback(),
      );

      await encerrarAgente(100);

      expect(agenteFalso.shutdown).toHaveBeenCalledWith(
        { collectPendingData: true, timeout: 100 },
        expect.any(Function),
      );
    });

    it('encerrarAgente resolve mesmo se o callback nunca vier', async () => {
      jest.useFakeTimers();
      agenteFalso.shutdown.mockImplementation(() => undefined);

      const promessa = encerrarAgente(100);
      jest.advanceTimersByTime(1100);

      await expect(promessa).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });
});
