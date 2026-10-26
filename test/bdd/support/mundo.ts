import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { setTimeout as aguardar } from 'node:timers/promises';
import {
  BeforeAll,
  World,
  setDefaultTimeout,
  setWorldConstructor,
} from '@cucumber/cucumber';

/**
 * Infraestrutura do BDD: endereços dos três serviços, chamadas HTTP e espera
 * pela Saga. Os serviços sobem pelo compose de test/integracao/ (README desta
 * pasta); os endereços padrão são as portas publicadas por ele.
 */
export const ENDERECOS = {
  os: process.env.BDD_OS_URL ?? 'http://localhost:3000',
  billing: process.env.BDD_BILLING_URL ?? 'http://localhost:3001/billing',
  execution: process.env.BDD_EXECUTION_URL ?? 'http://localhost:3002/execution',
  mercadoPago: process.env.BDD_MERCADO_PAGO_URL ?? 'http://localhost:8089',
};

// O mesmo segredo de JWT dos três serviços no compose. Assina o token do
// cliente, que em produção vem da Lambda de autenticação por CPF.
const JWT_SECRET = process.env.BDD_JWT_SECRET ?? 'segredo-de-integracao';

// A Saga é assíncrona: cada etapa espera a mensagem atravessar as filas. 30 s
// por espera cobre com folga o long polling dos consumidores.
const LIMITE_ESPERA_MS = 30_000;
const INTERVALO_ESPERA_MS = 500;
setDefaultTimeout(LIMITE_ESPERA_MS + 10_000);

export interface RespostaHttp {
  status: number;
  corpo: unknown;
}

export class MundoOficina extends World {
  tokenFuncionario = '';
  tokenCliente = '';

  // Cadastros do Contexto e o que o cenário cria, por nome ou papel.
  clienteId = '';
  cpf = '';
  placa = '';
  servicos = new Map<string, string>();
  pecas = new Map<string, string>();
  pecaId = '';

  osId = '';
  correlationId = '';
  orcamentoId = '';
  linkPagamento = '';

  async requisitar(
    metodo: string,
    url: string,
    opcoes: {
      token?: string;
      corpo?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<RespostaHttp> {
    const headers: Record<string, string> = { ...opcoes.headers };
    if (opcoes.token) headers.authorization = `Bearer ${opcoes.token}`;
    if (opcoes.corpo !== undefined)
      headers['content-type'] = 'application/json';
    const resposta = await fetch(url, {
      method: metodo,
      headers,
      body:
        opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    });
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
  }

  /**
   * Chamada que precisa dar certo para o cenário seguir. `T` é o formato da
   * resposta descrito no Swagger do serviço chamado.
   */
  async exigir<T>(
    metodo: string,
    url: string,
    opcoes: Parameters<MundoOficina['requisitar']>[2] = {},
  ): Promise<T> {
    const resposta = await this.requisitar(metodo, url, opcoes);
    if (resposta.status >= 400) {
      throw new Error(
        `${metodo} ${url} respondeu ${resposta.status}: ${JSON.stringify(resposta.corpo)}`,
      );
    }
    return resposta.corpo as T;
  }

  /**
   * Consulta de novo até o valor esperado aparecer ou o limite passar. É a
   * forma de esperar uma mensagem atravessar a fila, sem pausa fixa.
   */
  async esperar<T>(
    descricao: string,
    consultar: () => Promise<T>,
    esperado: T,
  ): Promise<void> {
    const limite = Date.now() + LIMITE_ESPERA_MS;
    let ultimo: T | undefined;
    while (Date.now() < limite) {
      ultimo = await consultar();
      if (ultimo === esperado) return;
      await aguardar(INTERVALO_ESPERA_MS);
    }
    throw new Error(
      `${descricao}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(ultimo)} depois de ${LIMITE_ESPERA_MS / 1000} s`,
    );
  }

  assinarTokenCliente(): string {
    const base64url = (valor: object) =>
      Buffer.from(JSON.stringify(valor)).toString('base64url');
    const cabecalho = base64url({ alg: 'HS256', typ: 'JWT' });
    const corpo = base64url({
      sub: this.clienteId,
      tipo: 'cliente',
      cpf: this.cpf,
      nome: 'Cliente BDD',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const assinatura = createHmac('sha256', JWT_SECRET)
      .update(`${cabecalho}.${corpo}`)
      .digest('base64url');
    return `${cabecalho}.${corpo}.${assinatura}`;
  }
}

setWorldConstructor(MundoOficina);

// Os serviços terminam de subir (migrações, filas) depois que o compose
// responde; o primeiro cenário só começa com os três prontos.
BeforeAll({ timeout: 130_000 }, async function () {
  const limite = Date.now() + 120_000;
  for (const url of [
    `${ENDERECOS.os}/health/ready`,
    `${ENDERECOS.billing}/health/ready`,
    `${ENDERECOS.execution}/health/ready`,
  ]) {
    for (;;) {
      const pronto = await fetch(url).then(
        (r) => r.ok,
        () => false,
      );
      if (pronto) break;
      if (Date.now() > limite)
        throw new Error(`${url} não ficou pronto em 120 s`);
      await aguardar(1_000);
    }
  }
});

/**
 * Dados únicos por execução (CPF válido, placa e SKU), para o cenário rodar de
 * novo no mesmo ambiente sem conflito de cadastro.
 */
export function cpfAleatorio(): string {
  const digitos = Array.from({ length: 9 }, () => randomInt(10));
  const verificador = (base: number[]) => {
    const soma = base.reduce(
      (total, d, i) => total + d * (base.length + 1 - i),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  digitos.push(verificador(digitos));
  digitos.push(verificador(digitos));
  return digitos.join('');
}

export function placaAleatoria(): string {
  const letra = () => String.fromCharCode(65 + randomInt(26));
  return `${letra()}${letra()}${letra()}${randomInt(10)}${letra()}${randomInt(10)}${randomInt(10)}`;
}

export function identificadorUnico(): string {
  return randomUUID().slice(0, 8);
}
