import { randomUUID } from 'node:crypto';

/** Formato comum de toda mensagem entre os serviços (docs/contratos.md, seção 3). */
export interface Envelope<T = Record<string, unknown>> {
  messageId: string;
  correlationId: string;
  osId: string;
  tipo: string;
  ocorridoEm: string;
  payload: T;
}

export class EnvelopeInvalidoError extends Error {
  constructor(motivo: string) {
    super(`Mensagem fora do formato do envelope: ${motivo}`);
    this.name = 'EnvelopeInvalidoError';
  }
}

export function criarEnvelope<T>(
  tipo: string,
  osId: string,
  correlationId: string,
  payload: T,
  agora: Date = new Date(),
): Envelope<T> {
  return {
    messageId: randomUUID(),
    correlationId,
    osId,
    tipo,
    ocorridoEm: agora.toISOString(),
    payload,
  };
}

const CAMPOS_TEXTO = [
  'messageId',
  'correlationId',
  'osId',
  'tipo',
  'ocorridoEm',
] as const;

/** Lê e valida o corpo de uma mensagem SQS. */
export function lerEnvelope(corpo: string | undefined): Envelope {
  let dado: unknown;
  try {
    dado = JSON.parse(corpo ?? '');
  } catch {
    throw new EnvelopeInvalidoError('corpo não é JSON');
  }

  validarEnvelope(dado);
  return dado;
}

/** Confere campo a campo o formato do envelope; lança se algo faltar. */
function validarEnvelope(dado: unknown): asserts dado is Envelope {
  if (typeof dado !== 'object' || dado === null) {
    throw new EnvelopeInvalidoError('corpo não é um objeto');
  }

  for (const campo of CAMPOS_TEXTO) {
    const valor: unknown = Reflect.get(dado, campo);
    if (typeof valor !== 'string' || valor === '') {
      throw new EnvelopeInvalidoError(`campo ${campo} ausente`);
    }
  }

  const payload: unknown = Reflect.get(dado, 'payload');
  if (typeof payload !== 'object' || payload === null) {
    throw new EnvelopeInvalidoError('campo payload ausente');
  }
}
