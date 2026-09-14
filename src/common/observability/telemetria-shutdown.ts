import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { encerrarAgente } from './newrelic';

/**
 * Último passo do desligamento: depois que o servidor HTTP parou de aceitar
 * requisições, o que o agente ainda tem em memória é enviado.
 *
 * Depende de `app.enableShutdownHooks()` no bootstrap e de o Node receber o
 * SIGTERM — por isso o CMD da imagem é `node` direto, em forma exec, e não um
 * `sh -c` que ficaria com o PID 1 e engoliria o sinal.
 */
@Injectable()
export class TelemetriaShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await encerrarAgente();
  }
}
