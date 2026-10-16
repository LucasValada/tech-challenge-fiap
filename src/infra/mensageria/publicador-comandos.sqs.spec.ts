import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { criarEnvelope } from '../../common/mensageria/envelope';
import { PublicadorComandosSqs } from './publicador-comandos.sqs';

describe('PublicadorComandosSqs', () => {
  const sqsMock = mockClient(SQSClient);
  const publicador = new PublicadorComandosSqs(
    new SQSClient({ region: 'us-east-1' }),
    {
      execution: 'https://sqs/oficina-execution-commands',
      billing: 'https://sqs/oficina-billing-commands',
    },
  );

  beforeEach(() => {
    sqsMock.reset();
    sqsMock.on(SendMessageCommand).resolves({});
  });

  it.each([
    ['IniciarDiagnostico', 'https://sqs/oficina-execution-commands'],
    ['IniciarReparo', 'https://sqs/oficina-execution-commands'],
    ['GerarOrcamento', 'https://sqs/oficina-billing-commands'],
    ['CancelarOrcamento', 'https://sqs/oficina-billing-commands'],
    ['EstornarPagamento', 'https://sqs/oficina-billing-commands'],
  ])('%s vai para %s', async (tipo, fila) => {
    await publicador.publicar(criarEnvelope(tipo, 'os-1', 'fluxo-1', {}));

    const [chamada] = sqsMock.commandCalls(SendMessageCommand);
    expect(chamada.args[0].input.QueueUrl).toBe(fila);
  });

  it('recusa o que não é comando da Saga', async () => {
    await expect(
      publicador.publicar(criarEnvelope('OrcamentoEnviado', 'os-1', 'f', {})),
    ).rejects.toThrow('OrcamentoEnviado não é um comando da Saga');
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });
});
