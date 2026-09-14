jest.mock('../../../../common/observability', () => ({
  incrementarMetrica: jest.fn(),
  registrarMetrica: jest.fn(),
  notificarErro: jest.fn(),
  registrarEvento: jest.fn(),
  registrarFalha: jest.fn(),
}));

import {
  incrementarMetrica,
  notificarErro,
  registrarEvento,
  registrarFalha,
  registrarMetrica,
} from '../../../../common/observability';
import {
  registrarFalhaOrdemServico,
  registrarOrdemCriada,
  registrarRejeicaoOrdemServico,
  registrarTransicaoDeStatus,
  segundosEntre,
} from './telemetria-ordem-servico';

describe('telemetria da ordem de serviço', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('registrarOrdemCriada', () => {
    it('conta a criação e emite o evento sem dado pessoal', () => {
      registrarOrdemCriada({
        ordemId: 'os-1',
        codigo: 'OS-2026-000001',
        clienteId: 'c-1',
        veiculoId: 'v-1',
        quantidadeServicos: 2,
        quantidadeItens: 1,
      });

      expect(incrementarMetrica).toHaveBeenCalledWith('OrdemServico/Criada');

      const [evento, dados] = (registrarEvento as jest.Mock).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(evento).toBe('ordem_servico.criada');
      expect(dados).toMatchObject({ ordem_id: 'os-1', quantidade_servicos: 2 });
      expect(Object.keys(dados)).not.toEqual(
        expect.arrayContaining(['cpf', 'cpfCnpj', 'placa']),
      );
    });
  });

  describe('registrarTransicaoDeStatus', () => {
    const base = {
      ordemId: 'os-1',
      tipoTransicao: 'AVANCO' as const,
      usuarioId: 'u-1',
    };

    it('indexa o tempo pelo status de ONDE a ordem saiu', () => {
      registrarTransicaoDeStatus({
        ...base,
        statusAnterior: 'EM_DIAGNOSTICO',
        statusNovo: 'AGUARDANDO_APROVACAO',
        segundosNoStatus: 1840,
        segundosDesdeAbertura: 5230,
      });

      expect(registrarMetrica).toHaveBeenCalledWith(
        'OrdemServico/TempoNoStatus/EM_DIAGNOSTICO',
        1840,
      );
      expect(incrementarMetrica).toHaveBeenCalledWith(
        'OrdemServico/Transicao/AGUARDANDO_APROVACAO',
      );
      // Não é entrega: lead time não é registrado.
      expect(registrarMetrica).toHaveBeenCalledTimes(1);
      expect(registrarEvento).toHaveBeenCalledWith(
        'ordem_servico.status_alterado',
        expect.objectContaining({
          status_anterior: 'EM_DIAGNOSTICO',
          duracao_status_segundos: 1840,
          duracao_total_segundos: 5230,
        }),
      );
    });

    it('registra o lead time no avanço para ENTREGUE', () => {
      registrarTransicaoDeStatus({
        ...base,
        statusAnterior: 'FINALIZADA',
        statusNovo: 'ENTREGUE',
        segundosNoStatus: 60,
        segundosDesdeAbertura: 86400,
      });

      expect(registrarMetrica).toHaveBeenCalledWith(
        'OrdemServico/TempoAteEntrega',
        86400,
      );
    });

    it('não registra lead time em rollback', () => {
      registrarTransicaoDeStatus({
        ...base,
        tipoTransicao: 'ROLLBACK',
        statusAnterior: 'AGUARDANDO_APROVACAO',
        statusNovo: 'EM_DIAGNOSTICO',
        segundosNoStatus: 30,
        segundosDesdeAbertura: 500,
      });

      expect(registrarMetrica).not.toHaveBeenCalledWith(
        'OrdemServico/TempoAteEntrega',
        expect.anything(),
      );
    });

    it('sem histórico anterior, conta a transição mas não inventa duração', () => {
      registrarTransicaoDeStatus({
        ...base,
        statusNovo: 'EM_DIAGNOSTICO',
      });

      expect(incrementarMetrica).toHaveBeenCalledWith(
        'OrdemServico/Transicao/EM_DIAGNOSTICO',
      );
      expect(registrarMetrica).not.toHaveBeenCalled();
    });
  });

  describe('falha x rejeição', () => {
    it('falha conta métrica, vai ao APM e ao log de erro', () => {
      const erro = new Error('connection refused');

      registrarFalhaOrdemServico('criacao', erro, {
        cliente_id: 'c-1',
        ausente: undefined,
      });

      expect(incrementarMetrica).toHaveBeenCalledWith(
        'OrdemServico/Falha/criacao',
      );
      expect(notificarErro).toHaveBeenCalledWith(erro, {
        'ordemServico.etapa': 'criacao',
        cliente_id: 'c-1',
      });
      expect(registrarFalha).toHaveBeenCalledWith(
        'ordem_servico.criacao_falhou',
        erro,
        expect.objectContaining({ cliente_id: 'c-1' }),
      );
    });

    it('rejeição de regra de negócio fica só no log, em warn', () => {
      class EstoqueInsuficienteError extends Error {
        name = 'EstoqueInsuficienteError';
      }

      registrarRejeicaoOrdemServico('criacao', new EstoqueInsuficienteError());

      expect(incrementarMetrica).not.toHaveBeenCalled();
      expect(notificarErro).not.toHaveBeenCalled();
      expect(registrarEvento).toHaveBeenCalledWith(
        'ordem_servico.criacao_rejeitada',
        { motivo: 'EstoqueInsuficienteError' },
        'warn',
      );
    });
  });

  describe('segundosEntre', () => {
    it('arredonda para segundos inteiros', () => {
      expect(
        segundosEntre(
          new Date('2026-09-10T10:00:00.000Z'),
          new Date('2026-09-10T10:00:01.600Z'),
        ),
      ).toBe(2);
    });

    it('descarta intervalo negativo (relógio fora de ordem) e ausente', () => {
      const agora = new Date();
      expect(segundosEntre(agora, new Date(agora.getTime() - 1000))).toBe(
        undefined,
      );
      expect(segundosEntre(undefined, agora)).toBeUndefined();
      expect(segundosEntre(agora, null)).toBeUndefined();
    });
  });
});
