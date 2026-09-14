import type { PinoLogger } from 'nestjs-pino';
import {
  configurarTelemetria,
  redefinirTelemetria,
  registrarEvento,
  registrarFalha,
} from './telemetria';
import { metadadosDeTrace, redefinirAgenteParaTestes } from './newrelic';

describe('telemetria', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redefinirTelemetria();
  });

  afterEach(() => {
    redefinirTelemetria();
  });

  describe('sem bootstrap', () => {
    // Garante que rodar um caso de uso em teste unitário não escreve nada na
    // saída — o logger só existe depois que a aplicação sobe.
    it('registrarEvento não faz nada e não lança', () => {
      expect(() => registrarEvento('ordem_servico.criada')).not.toThrow();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('registrarFalha não faz nada e não lança', () => {
      expect(() =>
        registrarFalha('ordem_servico.criacao_falhou', new Error('x')),
      ).not.toThrow();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('com o logger configurado', () => {
    beforeEach(() => {
      configurarTelemetria(logger as unknown as PinoLogger);
    });

    it('escreve o evento como mensagem e como atributo', () => {
      registrarEvento('ordem_servico.criada', { ordem_id: 'os-1' });

      expect(logger.info).toHaveBeenCalledWith(
        { evento: 'ordem_servico.criada', ordem_id: 'os-1' },
        'ordem_servico.criada',
      );
    });

    it('respeita o nível pedido', () => {
      registrarEvento('ordem_servico.fluxo_lento', {}, 'warn');

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('quebra o Error nos campos que o New Relic correlaciona', () => {
      const erro = new TypeError('conexão recusada');

      registrarFalha('integracao.banco.falha', erro, { ordem_id: 'os-2' });

      const [objeto, mensagem] = logger.error.mock.calls[0] as [
        Record<string, unknown>,
        string,
      ];

      expect(mensagem).toBe('conexão recusada');
      expect(objeto).toMatchObject({
        evento: 'integracao.banco.falha',
        'error.message': 'conexão recusada',
        'error.class': 'TypeError',
        ordem_id: 'os-2',
      });
      expect(typeof objeto['error.stack']).toBe('string');
    });

    it('aceita erro que não é Error', () => {
      registrarFalha('integracao.email.falha', 'timeout');

      const [objeto, mensagem] = logger.error.mock.calls[0] as [
        Record<string, unknown>,
        string,
      ];

      expect(mensagem).toBe('timeout');
      expect(objeto['error.message']).toBe('timeout');
      expect(objeto).not.toHaveProperty('error.class');
    });
  });
});

describe('metadadosDeTrace', () => {
  const ambienteOriginal = process.env.NEW_RELIC_ENABLED;

  afterEach(() => {
    process.env.NEW_RELIC_ENABLED = ambienteOriginal;
    redefinirAgenteParaTestes();
  });

  it('devolve objeto vazio com o agente desligado, sem carregar o pacote', () => {
    delete process.env.NEW_RELIC_ENABLED;
    redefinirAgenteParaTestes();

    expect(metadadosDeTrace()).toEqual({});
  });
});
