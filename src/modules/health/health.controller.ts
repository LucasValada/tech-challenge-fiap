import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoints de saúde (públicos, sem JWT):
 * - `GET /health`       liveness — raso, só confirma que o processo responde.
 *   Usado pelo liveness probe do k8s e pelo health check do ALB (um blip no
 *   banco não deve derrubar/retirar os pods).
 * - `GET /health/ready` readiness — checa o banco (`SELECT 1`); responde 503 se
 *   o banco não responde. Usado pelo readiness probe do k8s para tirar do
 *   Service um pod sem banco.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness — processo no ar (não checa dependências)',
  })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — checa a conexão com o banco' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
