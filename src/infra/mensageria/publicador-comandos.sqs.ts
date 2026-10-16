import type { SQSClient } from '@aws-sdk/client-sqs';
import type { Envelope } from '../../common/mensageria/envelope';
import { PublicadorSqs } from '../../common/mensageria/publicador-sqs';
import {
  COMANDOS,
  type PublicadorComandos,
} from '../../modules/ordem-servico/application/saga/mensagens-saga';

export interface FilasDeComandos {
  /** oficina-execution-commands */
  execution: string;
  /** oficina-billing-commands */
  billing: string;
}

/**
 * Publica cada comando da Saga na fila de quem o executa (docs/contratos.md,
 * seção 4): diagnóstico e reparo no Execution; orçamento, cancelamento e
 * estorno no Billing.
 */
export class PublicadorComandosSqs implements PublicadorComandos {
  private readonly destinos: Map<string, PublicadorSqs>;

  constructor(sqs: SQSClient, filas: FilasDeComandos) {
    const execution = new PublicadorSqs(sqs, filas.execution);
    const billing = new PublicadorSqs(sqs, filas.billing);
    this.destinos = new Map([
      [COMANDOS.iniciarDiagnostico, execution],
      [COMANDOS.iniciarReparo, execution],
      [COMANDOS.gerarOrcamento, billing],
      [COMANDOS.cancelarOrcamento, billing],
      [COMANDOS.estornarPagamento, billing],
    ]);
  }

  async publicar(envelope: Envelope<unknown>): Promise<void> {
    const destino = this.destinos.get(envelope.tipo);
    if (!destino) {
      throw new Error(`${envelope.tipo} não é um comando da Saga`);
    }
    await destino.publicar(envelope);
  }
}
