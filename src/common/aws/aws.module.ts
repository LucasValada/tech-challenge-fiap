import { Global, Module } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';

/**
 * Cliente do SQS compartilhado pelo serviço. A região vem de AWS_REGION e as
 * credenciais da role dos nós do EKS (cadeia padrão do SDK). Localmente,
 * AWS_ENDPOINT_URL aponta para o LocalStack — o SDK lê essa variável sozinho.
 */
@Global()
@Module({
  providers: [{ provide: SQSClient, useFactory: () => new SQSClient({}) }],
  exports: [SQSClient],
})
export class AwsModule {}
