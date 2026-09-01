import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth';
import { VeiculoModule } from './modules/veiculo';
import { ItemEstoqueModule } from './modules/item-estoque/item-estoque.module';
import { ClienteModule } from './modules/cliente/cliente.module';
import { OrdemServicoModule } from './modules/ordem-servico';
import { ServicoModule } from './modules/servico/servico.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Logs estruturados em JSON com correlação por requisição. O correlationId
    // reaproveita um id vindo do API Gateway/Lambda (que já loga com o mesmo
    // formato) quando presente, senão gera um — e é devolvido no header
    // `x-correlation-id`, fechando a correlação ponta a ponta.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const header =
            req.headers['x-correlation-id'] ??
            req.headers['x-request-id'] ??
            req.headers['x-amzn-request-id'] ??
            req.headers['x-amzn-trace-id'];
          const id = (Array.isArray(header) ? header[0] : header) ?? randomUUID();
          res.setHeader('x-correlation-id', id);
          return id;
        },
        customProps: (req: IncomingMessage & { id?: string }) => ({
          correlationId: req.id,
        }),
        // Não polui o log com o ruído das sondas de saúde e do Swagger.
        autoLogging: {
          ignore: (req: IncomingMessage) => {
            const url = req.url ?? '';
            return url.startsWith('/health') || url.startsWith('/api');
          },
        },
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-webhook-token"]',
        ],
      },
    }),
    HealthModule,
    UserModule,
    PrismaModule,
    AuthModule,
    VeiculoModule,
    ItemEstoqueModule,
    ServicoModule,
    ClienteModule,
    OrdemServicoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
