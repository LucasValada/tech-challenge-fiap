import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { contextoDoFluxo } from '../observability/contexto-fluxo';
import { ConsumidorSqs } from './consumidor-sqs';
import { criarEnvelope } from './envelope';

const FILA =
  'https://sqs.us-east-1.amazonaws.com/000000000000/oficina-os-saga-replies';

describe('ConsumidorSqs', () => {
  const sqsMock = mockClient(SQSClient);
  const sqs = new SQSClient({ region: 'us-east-1' });

  beforeEach(() => sqsMock.reset());

  function mensagem(corpo: string, id = 'm1') {
    return { MessageId: id, ReceiptHandle: `rh-${id}`, Body: corpo };
  }

  it('processa no contexto do fluxo e apaga a mensagem', async () => {
    const envelope = criarEnvelope(
      'DiagnosticoIniciado',
      'os-1',
      'fluxo-1',
      {},
    );
    sqsMock
      .on(ReceiveMessageCommand)
      .resolves({ Messages: [mensagem(JSON.stringify(envelope))] });
    sqsMock.on(DeleteMessageCommand).resolves({});
    const vistos: unknown[] = [];

    const consumidor = new ConsumidorSqs(sqs, FILA, (e) => {
      vistos.push([e.tipo, contextoDoFluxo()]);
      return Promise.resolve();
    });

    await expect(consumidor.consumirUmaVez()).resolves.toBe(1);
    expect(vistos).toEqual([
      ['DiagnosticoIniciado', { correlationId: 'fluxo-1', osId: 'os-1' }],
    ]);
    expect(sqsMock.commandCalls(DeleteMessageCommand)[0].args[0].input).toEqual(
      {
        QueueUrl: FILA,
        ReceiptHandle: 'rh-m1',
      },
    );
    expect(
      sqsMock.commandCalls(ReceiveMessageCommand)[0].args[0].input,
    ).toMatchObject({ QueueUrl: FILA, WaitTimeSeconds: 20 });
  });

  it('não apaga quando o processamento falha (o SQS reenvia e depois manda para a DLQ)', async () => {
    const envelope = criarEnvelope(
      'DiagnosticoIniciado',
      'os-1',
      'fluxo-1',
      {},
    );
    sqsMock
      .on(ReceiveMessageCommand)
      .resolves({ Messages: [mensagem(JSON.stringify(envelope))] });

    const consumidor = new ConsumidorSqs(sqs, FILA, () =>
      Promise.reject(new Error('DynamoDB fora')),
    );

    await expect(consumidor.consumirUmaVez()).resolves.toBe(0);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
  });

  it('não apaga mensagem fora do formato do envelope', async () => {
    sqsMock
      .on(ReceiveMessageCommand)
      .resolves({ Messages: [mensagem('lixo')] });
    const processar = jest.fn();

    const consumidor = new ConsumidorSqs(sqs, FILA, processar);

    await expect(consumidor.consumirUmaVez()).resolves.toBe(0);
    expect(processar).not.toHaveBeenCalled();
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
  });

  it('trata fila vazia', async () => {
    sqsMock.on(ReceiveMessageCommand).resolves({});

    const consumidor = new ConsumidorSqs(sqs, FILA, jest.fn());

    await expect(consumidor.consumirUmaVez()).resolves.toBe(0);
  });

  it('o laço continua depois de erro no recebimento e para quando pedido', async () => {
    const envelope = criarEnvelope(
      'DiagnosticoIniciado',
      'os-1',
      'fluxo-1',
      {},
    );
    sqsMock
      .on(ReceiveMessageCommand)
      .rejectsOnce(new Error('rede'))
      .resolves({ Messages: [mensagem(JSON.stringify(envelope))] });
    sqsMock.on(DeleteMessageCommand).resolves({});
    const processar = jest.fn(() => {
      consumidor.parar();
      return Promise.resolve();
    });
    const consumidor = new ConsumidorSqs(sqs, FILA, processar, 1);

    await consumidor.iniciar();

    expect(processar).toHaveBeenCalledTimes(1);
    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(2);
  });

  it('parar durante o recebimento encerra o laço sem registrar falha', async () => {
    sqsMock.on(ReceiveMessageCommand).callsFake(() => {
      consumidor.parar();
      return Promise.reject(new Error('abortado'));
    });
    const consumidor = new ConsumidorSqs(sqs, FILA, jest.fn(), 1);

    await expect(consumidor.iniciar()).resolves.toBeUndefined();
    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
  });
});
