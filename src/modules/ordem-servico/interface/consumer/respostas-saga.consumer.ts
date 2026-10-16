import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ConsumidorSqs } from '../../../../common/mensageria/consumidor-sqs';
import { ProcessarRespostaSagaUseCase } from '../../application/use-case/processar-resposta-saga.use-case';

/**
 * Liga a fila `oficina-os-saga-replies` ao orquestrador. O laço de consumo
 * começa quando a aplicação termina de subir e para no desligamento (SIGTERM do
 * Kubernetes), antes de o processo sair.
 */
@Injectable()
export class RespostasSagaConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly consumidor: ConsumidorSqs;

  constructor(sqs: SQSClient, processarResposta: ProcessarRespostaSagaUseCase) {
    this.consumidor = new ConsumidorSqs(
      sqs,
      process.env.SAGA_REPLIES_QUEUE_URL ?? '',
      (envelope) => processarResposta.execute(envelope),
    );
  }

  onApplicationBootstrap(): void {
    void this.consumidor.iniciar();
  }

  onApplicationShutdown(): void {
    this.consumidor.parar();
  }
}
