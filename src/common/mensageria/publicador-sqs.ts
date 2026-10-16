import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { Envelope } from './envelope';

/** Publica envelopes numa fila SQS. */
export class PublicadorSqs {
  constructor(
    private readonly sqs: SQSClient,
    private readonly filaUrl: string,
  ) {}

  async publicar(envelope: Envelope<unknown>): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.filaUrl,
        MessageBody: JSON.stringify(envelope),
        // O tipo também como atributo: dá para ver o que há na fila (ou na DLQ)
        // pelo console da AWS sem abrir o corpo de cada mensagem.
        MessageAttributes: {
          tipo: { DataType: 'String', StringValue: envelope.tipo },
        },
      }),
    );
  }
}
