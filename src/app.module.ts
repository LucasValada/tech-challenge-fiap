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
import {
  metadadosDeTrace,
  tagsDeObservabilidade,
} from './common/observability';
import { TelemetriaShutdown } from './common/observability/telemetria-shutdown';

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

        // ─── Contrato de campos esperado pelo New Relic ────────────────────
        // Três renomeações que parecem cosméticas e não são: com os nomes
        // padrão do pino, o log chega mas é indexado errado.

        // `msg` viraria um atributo qualquer e a UI mostraria o JSON cru na
        // lista de logs; `message` é o campo que o New Relic trata como corpo.
        messageKey: 'message',

        // `level` numérico (30, 50) não é mapeado para severidade. O rótulo é.
        formatters: {
          level: (label: string) => ({ level: label }),
        },

        // `time` não é reconhecido: o registro assumiria o horário de ingestão,
        // e um atraso no Fluent Bit reordenaria a linha do tempo justamente
        // durante um incidente. `timestamp` em epoch ms é lido corretamente.
        // A opção recebe o fragmento serializado, daí a vírgula inicial.
        timestamp: () => `,"timestamp":${Date.now()}`,

        // Substituem o par pid/hostname padrão. `environment` e `project` são
        // as tags do projeto em toda a telemetria, e é por elas (mais `servico`)
        // que os alertas e os painéis filtram — escritas pela aplicação, não
        // dependem da convenção de nomes do coletor.
        //
        // Vêm de NEW_RELIC_LABELS, a mesma variável com que o agente de APM
        // marca a entidade: um valor governa as tags do APM e as do log.
        base: {
          servico: process.env.NEW_RELIC_APP_NAME ?? 'oficina-api',
          environment: process.env.NODE_ENV ?? 'desconhecido',
          ...tagsDeObservabilidade(),
        },

        // Roda a cada linha e acrescenta `trace.id`, `span.id`, `entity.guid` e
        // `entity.name` do APM. É o que liga log e trace distribuído nos dois
        // sentidos. Com o agente desligado devolve objeto vazio, e o log sai
        // igual, sem os campos de correlação.
        mixin: () => metadadosDeTrace(),

        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const header =
            req.headers['x-correlation-id'] ??
            req.headers['x-request-id'] ??
            req.headers['x-amzn-request-id'] ??
            req.headers['x-amzn-trace-id'];
          const id =
            (Array.isArray(header) ? header[0] : header) ?? randomUUID();
          res.setHeader('x-correlation-id', id);
          return id;
        },

        // ─── Volume (free tier: 100 GB/mês) ────────────────────────────────
        // Por padrão o pino-http prende o `req` inteiro — headers, query,
        // params, IP e porta — a TODA linha emitida dentro da requisição, não
        // só à de "request completed". São 0,6–1 KB repetidos por linha.
        //
        // Com `quietReqLogger`, as linhas de dentro da requisição levam só o id,
        // gravado como `correlationId` (o mesmo nome de antes, então nenhuma
        // consulta muda). O `req` completo fica apenas na linha de conclusão,
        // e mesmo ali reduzido pelos serializers abaixo.
        quietReqLogger: true,
        customAttributeKeys: { reqId: 'correlationId' },

        // Método e rota bastam para responder "o que foi chamado"; o APM já tem
        // o resto por transação. A query string sai de propósito: a consulta
        // pública de OS recebe a placa por ela, e log não leva dado pessoal.
        serializers: {
          req: (req: { method?: string; url?: string }) => ({
            method: req.method,
            url: (req.url ?? '').split('?')[0],
          }),
          res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode,
          }),
        },
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
  providers: [TelemetriaShutdown],
})
export class AppModule {}
