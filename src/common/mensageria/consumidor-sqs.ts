import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { executarNoFluxo } from '../observability/contexto-fluxo';
import { registrarEvento, registrarFalha } from '../observability';
import { type Envelope, lerEnvelope } from './envelope';

export type ProcessarEnvelope = (envelope: Envelope) => Promise<void>;

/**
 * Consome uma fila SQS com long polling e entrega cada envelope ao processador.
 *
 * Regras de docs/contratos.md: a mensagem só é apagada depois de processada com
 * sucesso. Se o processamento falha, ela volta para a fila quando o visibility
 * timeout vence e, depois de 5 tentativas, o SQS a move para a DLQ. Mensagem
 * fora do formato do envelope segue o mesmo caminho e para na DLQ para análise,
 * em vez de ser descartada em silêncio.
 */
export class ConsumidorSqs {
  private ativo = false;
  private abortador?: AbortController;

  constructor(
    private readonly sqs: SQSClient,
    private readonly filaUrl: string,
    private readonly processar: ProcessarEnvelope,
    private readonly esperaAposErroMs = 5000,
  ) {}

  /** Laço de consumo; roda até `parar()`. Não deve ser aguardado no bootstrap. */
  async iniciar(): Promise<void> {
    this.ativo = true;
    while (this.ativo) {
      try {
        await this.consumirUmaVez();
      } catch (erro) {
        if (!this.ativo) break;
        registrarFalha('mensageria.recebimento_falhou', erro, {
          fila: this.filaUrl,
        });
        await new Promise((r) => setTimeout(r, this.esperaAposErroMs));
      }
    }
  }

  parar(): void {
    this.ativo = false;
    this.abortador?.abort();
  }

  /** Uma rodada de long polling; devolve quantas mensagens foram processadas. */
  async consumirUmaVez(): Promise<number> {
    this.abortador = new AbortController();
    const resposta = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.filaUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }),
      { abortSignal: this.abortador.signal },
    );

    let processadas = 0;
    for (const mensagem of resposta.Messages ?? []) {
      if (await this.tratar(mensagem)) processadas++;
    }
    return processadas;
  }

  private async tratar(mensagem: Message): Promise<boolean> {
    let envelope: Envelope;
    try {
      envelope = lerEnvelope(mensagem.Body);
    } catch (erro) {
      registrarFalha('mensageria.mensagem_invalida', erro, {
        fila: this.filaUrl,
        sqs_message_id: mensagem.MessageId,
      });
      return false;
    }

    return executarNoFluxo(
      { correlationId: envelope.correlationId, osId: envelope.osId },
      async () => {
        try {
          await this.processar(envelope);
        } catch (erro) {
          registrarFalha('mensageria.processamento_falhou', erro, {
            tipo: envelope.tipo,
            message_id: envelope.messageId,
          });
          return false;
        }

        await this.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: this.filaUrl,
            ReceiptHandle: mensagem.ReceiptHandle,
          }),
        );
        registrarEvento('mensageria.mensagem_processada', {
          tipo: envelope.tipo,
          message_id: envelope.messageId,
        });
        return true;
      },
    );
  }
}
