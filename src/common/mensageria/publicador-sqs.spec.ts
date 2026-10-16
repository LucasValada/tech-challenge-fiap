import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { criarEnvelope } from './envelope';
import { PublicadorSqs } from './publicador-sqs';

describe('PublicadorSqs', () => {
  const sqsMock = mockClient(SQSClient);

  beforeEach(() => sqsMock.reset());

  it('envia o envelope como JSON e o tipo como atributo', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'x' });
    const envelope = criarEnvelope('DiagnosticoConcluido', 'os-1', 'fluxo-1', {
      concluidoEm: '2026-10-20T15:00:00.000Z',
    });

    await new PublicadorSqs(
      new SQSClient({ region: 'us-east-1' }),
      'https://fila/oficina-os-saga-replies',
    ).publicar(envelope);

    const input = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input;
    expect(input.QueueUrl).toBe('https://fila/oficina-os-saga-replies');
    expect(JSON.parse(input.MessageBody!)).toEqual(envelope);
    expect(input.MessageAttributes).toEqual({
      tipo: { DataType: 'String', StringValue: 'DiagnosticoConcluido' },
    });
  });
});
