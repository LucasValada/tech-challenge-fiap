import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export const WEBHOOK_TOKEN_HEADER = 'x-webhook-token';
export const WEBHOOK_TOKEN_ENV = 'WEBHOOK_ORCAMENTO_TOKEN';

@Injectable()
export class WebhookTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[WEBHOOK_TOKEN_HEADER];
    const expected = process.env[WEBHOOK_TOKEN_ENV];

    if (!expected) {
      throw new InternalServerErrorException(
        `${WEBHOOK_TOKEN_ENV} não configurado no ambiente`,
      );
    }

    if (typeof provided !== 'string' || provided.length === 0) {
      throw new UnauthorizedException('Token de webhook ausente');
    }

    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    return true;
  }
}
