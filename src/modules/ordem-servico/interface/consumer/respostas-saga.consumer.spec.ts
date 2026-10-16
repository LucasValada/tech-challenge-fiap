import { SQSClient } from '@aws-sdk/client-sqs';
import { ConsumidorSqs } from '../../../../common/mensageria/consumidor-sqs';
import { criarEnvelope } from '../../../../common/mensageria/envelope';
import type { ProcessarRespostaSagaUseCase } from '../../application/use-case/processar-resposta-saga.use-case';
import { RespostasSagaConsumer } from './respostas-saga.consumer';

jest.mock('../../../../common/mensageria/consumidor-sqs');

describe('RespostasSagaConsumer', () => {
  // O consumidor da fila é simulado: o que importa aqui é a ligação entre a
  // fila de respostas e o orquestrador, feita pelo construtor do ConsumidorSqs.
  const ConsumidorSqsSimulado = jest.mocked(ConsumidorSqs);

  beforeEach(() => ConsumidorSqsSimulado.mockClear());

  function montar() {
    process.env.SAGA_REPLIES_QUEUE_URL = 'https://fila/oficina-os-saga-replies';
    const sqs = new SQSClient({ region: 'us-east-1' });
    const processar = { execute: jest.fn().mockResolvedValue(undefined) };
    const consumer = new RespostasSagaConsumer(
      sqs,
      processar as unknown as ProcessarRespostaSagaUseCase,
    );
    return { sqs, processar, consumer };
  }

  it('liga a fila de respostas ao orquestrador', async () => {
    const { sqs, processar } = montar();

    const [cliente, fila, processarEnvelope] =
      ConsumidorSqsSimulado.mock.calls[0];
    expect(cliente).toBe(sqs);
    expect(fila).toBe('https://fila/oficina-os-saga-replies');

    const envelope = criarEnvelope('DiagnosticoIniciado', 'os-1', 'c', {});
    await processarEnvelope(envelope);
    expect(processar.execute).toHaveBeenCalledWith(envelope);
  });

  it('inicia o consumo na subida e para no desligamento', () => {
    const { consumer } = montar();
    const consumidor = jest.mocked(ConsumidorSqsSimulado.mock.instances[0]);

    consumer.onApplicationBootstrap();
    consumer.onApplicationShutdown();

    expect(consumidor.iniciar.mock.calls).toHaveLength(1);
    expect(consumidor.parar.mock.calls).toHaveLength(1);
  });
});
