import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Identifica o fluxo de uma OS nos logs fora de uma requisição HTTP — no
 * consumo de mensagens da fila, onde o pino-http não cria contexto.
 *
 * O `correlationId` é o mesmo que nasceu na abertura da OS e viaja em toda
 * mensagem (docs/contratos.md), então as linhas deste serviço aparecem junto com
 * as do OS e do Billing quando se filtra por ele no New Relic.
 *
 * Nas rotas HTTP o pino-http já grava o `correlationId` da requisição; por isso
 * este contexto só é preenchido no consumo de mensagens, e as duas fontes nunca
 * escrevem o mesmo campo na mesma linha.
 */
export interface ContextoFluxo {
  correlationId: string;
  osId?: string;
}

const armazenamento = new AsyncLocalStorage<ContextoFluxo>();

export function executarNoFluxo<T>(
  contexto: ContextoFluxo,
  acao: () => Promise<T>,
): Promise<T> {
  return armazenamento.run(contexto, acao);
}

/** Campos do fluxo corrente, ou objeto vazio fora de um consumo de mensagem. */
export function contextoDoFluxo(): Partial<ContextoFluxo> {
  return armazenamento.getStore() ?? {};
}
