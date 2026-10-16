import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export const INTERNAL_TOKEN_HEADER = 'x-internal-token';
export const INTERNAL_TOKEN_ENV = 'INTERNAL_API_TOKEN';

/**
 * Protege as rotas `/internal/...`, chamadas por componentes do próprio projeto
 * (a Lambda de autenticação). Elas passam pelo mesmo ALB que o API Gateway
 * alcança, então a proteção é o token compartilhado, guardado no SSM
 * (docs/contratos.md, seção 7).
 *
 * A comparação é em tempo constante, para o tempo de resposta não revelar
 * quantos caracteres do token estão certos.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const recebido = request.headers[INTERNAL_TOKEN_HEADER];
    const esperado = process.env[INTERNAL_TOKEN_ENV];

    if (!esperado) {
      throw new InternalServerErrorException(
        `${INTERNAL_TOKEN_ENV} não configurado no ambiente`,
      );
    }
    if (typeof recebido !== 'string' || recebido.length === 0) {
      throw new UnauthorizedException('Token interno ausente');
    }

    const recebidoBuf = Buffer.from(recebido);
    const esperadoBuf = Buffer.from(esperado);
    if (
      recebidoBuf.length !== esperadoBuf.length ||
      !timingSafeEqual(recebidoBuf, esperadoBuf)
    ) {
      throw new UnauthorizedException('Token interno inválido');
    }
    return true;
  }
}
