import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { notificarErro, registrarFalha } from '../observability';

/**
 * A consulta pública de OS recebe a placa na query string. Log e APM saem do
 * cluster para um serviço externo; a rota sem a query responde a mesma
 * pergunta sem levar dado pessoal junto.
 */
function semQueryString(url: string | undefined): string {
  return (url ?? '').split('?')[0];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);

    this.registrarOcorrencia(request, statusCode, exception);

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * 5xx vira evento de falha, com nome próprio: é o que os painéis e o alerta
   * de erro da API consultam. 4xx continua apenas no log — é erro do cliente, e
   * transformá-lo em evento faria cada CPF inválido contar como incidente.
   *
   * O 5xx também vai ao APM por `noticeError`. A exceção morre aqui, tratada, e
   * o agente só enxergaria o status 500 da resposta — sem classe, sem stack e
   * sem ligação com a linha de código que quebrou.
   */
  private registrarOcorrencia(
    request: Request,
    statusCode: number,
    exception: unknown,
  ): void {
    const rota = semQueryString(request.url);

    if (statusCode >= 500) {
      notificarErro(exception, {
        'http.method': request.method,
        'http.route': rota,
        'http.statusCode': statusCode,
      });

      registrarFalha('api.erro_interno', exception, {
        metodo: request.method,
        rota,
        status_code: statusCode,
      });

      return;
    }

    // 4xx em `warn` e sem stack. É erro do cliente — o stack de um 401 aponta
    // para o guard, não para um defeito —, e cada stack custa 1–2 KB de log
    // por requisição recusada, na mesma cota de 100 GB/mês que o resto usa.
    this.logger.warn(
      `[${request.method}] ${rota} -> ${statusCode}: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
    );
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    }

    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private handleHttpException(exception: HttpException): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const resp = exceptionResponse as Record<string, unknown>;
      return {
        statusCode: status,
        message: resp.message as string | string[],
        error: (resp.error as string) ?? exception.name,
      };
    }

    return {
      statusCode: status,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exception.message,
      error: exception.name,
    };
  }

  private handlePrismaError(exception: PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target =
          (exception.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Record with ${target} already exists`,
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };
      case 'P2003': {
        const field = (exception.meta?.field_name as string) ?? 'field';
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid reference in field: ${field}`,
          error: 'Bad Request',
        };
      }
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
        };
    }
  }
}
