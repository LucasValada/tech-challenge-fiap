import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, PinoLogger } from 'nestjs-pino';
import { validateEnv } from './core/config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import {
  configurarTelemetria,
  notificarErro,
  registrarEvento,
  tagsDeObservabilidade,
} from './common/observability';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Roteia os logs internos do Nest pelo pino (JSON estruturado + correlationId).
  app.useLogger(app.get(Logger));

  // SIGTERM do Kubernetes (rollout, scale-in do HPA) passa a fechar a
  // aplicação em ordem, e o último passo é o agente descarregar o buffer
  // (TelemetriaShutdown). Sem isto o processo morre com métricas em memória.
  app.enableShutdownHooks();

  // Dá aos eventos de negócio o mesmo logger das requisições: eles passam a
  // herdar o correlationId e os campos de trace sem que nenhum caso de uso
  // precise receber o logger no construtor.
  //
  // `resolve`, e não `get`: o PinoLogger é transient-scoped no nestjs-pino, e
  // `app.get()` lança InvalidClassScopeException — a aplicação não subia. A
  // instância resolvida continua buscando o logger da requisição corrente a
  // cada chamada (AsyncLocalStorage), então nada de contexto fica congelado.
  configurarTelemetria(await app.resolve(PinoLogger));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tech Challenge Fiap - SOAT Oficina')
    .setDescription(
      'API de gerenciamento de oficina mecânica. Gerencie clientes, veículos, serviços, peças/insumos e ordens de serviço.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const porta = process.env.APPLICATION_PORT ?? 3000;
  await app.listen(porta);

  registrarEvento('aplicacao.iniciada', {
    porta: Number(porta),
    node_env: process.env.NODE_ENV,
  });
}

bootstrap().catch((error: unknown) => {
  // Falha de inicialização é o log mais difícil de ler depois: o pod entra em
  // CrashLoop e `kubectl logs` só mostra a última tentativa. Quebrando antes do
  // Nest subir não há pino configurado, então a linha é montada à mão — mas no
  // MESMO contrato de campos, para continuar sendo JSON puro e cair nos mesmos
  // filtros (`level`, `evento`, `environment`) que qualquer outra falha.
  const erro = error instanceof Error ? error : new Error(String(error));

  notificarErro(erro, { evento: 'aplicacao.falha_ao_iniciar' });

  process.stderr.write(
    JSON.stringify({
      level: 'fatal',
      timestamp: Date.now(),
      servico: process.env.NEW_RELIC_APP_NAME ?? 'oficina-api',
      environment: process.env.NODE_ENV ?? 'desconhecido',
      ...tagsDeObservabilidade(),
      evento: 'aplicacao.falha_ao_iniciar',
      'error.class': erro.name,
      'error.message': erro.message,
      'error.stack': erro.stack,
      message: `Falha ao iniciar a aplicação: ${erro.message}`,
    }) + '\n',
  );

  process.exit(1);
});
