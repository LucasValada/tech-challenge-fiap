export type MetadadosTrace = Record<string, string>;

export type AtributosErro = Record<string, string | number | boolean>;

interface AgenteNewRelic {
  getLinkingMetadata?: (omitSupportability?: boolean) => MetadadosTrace;
  recordMetric?: (nome: string, valor: number) => void;
  incrementMetric?: (nome: string, valor?: number) => void;
  noticeError?: (erro: Error, atributos?: AtributosErro) => void;
  shutdown?: (
    opcoes: { collectPendingData?: boolean; timeout?: number },
    callback?: (erro?: Error) => void,
  ) => void;
}

let agente: AgenteNewRelic | null | undefined;

/**
 * O agente é carregado por `node -r newrelic`, antes de qualquer módulo da
 * aplicação — é essa ordem que permite a ele instrumentar Express, Prisma e o
 * cliente HTTP no momento em que são importados. Aqui só pegamos a referência
 * ao singleton que já está de pé.
 *
 * `NEW_RELIC_ENABLED` é a mesma variável que o próprio agente lê, então um
 * único valor governa os dois lados. Sem ela o `require` nem acontece: em
 * teste, importar o pacote subiria o agente inteiro dentro do jest.
 */
function carregarAgente(): AgenteNewRelic | null {
  if (agente !== undefined) return agente;

  if (process.env.NEW_RELIC_ENABLED !== 'true') {
    agente = null;
    return agente;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    agente = require('newrelic') as AgenteNewRelic;
  } catch {
    agente = null;
  }

  return agente;
}

/**
 * Telemetria nunca derruba regra de negócio: qualquer exceção do agente morre
 * aqui. O pior caso aceitável é uma métrica a menos, não uma ordem de serviço
 * a menos.
 */
function comAgente(acao: (agente: AgenteNewRelic) => void): void {
  const carregado = carregarAgente();

  if (!carregado) return;

  try {
    acao(carregado);
  } catch {
    // ver comentário acima
  }
}

/**
 * `trace.id`, `span.id`, `entity.guid`, `entity.name`, `entity.type` e
 * `hostname`.
 *
 * Os nomes são exatamente estes porque é o contrato de "logs in context" do
 * New Relic: com eles no JSON, cada linha ganha o botão que leva ao trace
 * distribuído da requisição que a produziu, e o trace ganha a lista de logs
 * emitidos dentro dele. Renomear qualquer um quebra a ligação em silêncio — o
 * log continua chegando e deixa de se conectar a coisa nenhuma.
 *
 * Fora de uma transação (na subida da aplicação, por exemplo) o agente devolve
 * só a identidade da entidade, sem `trace.id`. É o comportamento esperado.
 *
 * O `true` dispensa a métrica de supportability que o agente incrementaria a
 * cada chamada — e esta roda uma vez por linha de log.
 */
export function metadadosDeTrace(): MetadadosTrace {
  const carregado = carregarAgente();

  if (!carregado?.getLinkingMetadata) return {};

  try {
    return carregado.getLinkingMetadata(true);
  } catch {
    return {};
  }
}

/**
 * Métricas customizadas (timeslice) do APM.
 *
 * O nome vai SEM o prefixo `Custom/`: o agente o acrescenta sozinho em
 * `recordMetric` e `incrementMetric`, e passar `Custom/...` produziria
 * `Custom/Custom/...` — que nenhuma consulta encontra.
 *
 * São agregadas dentro do processo e enviadas uma vez por ciclo de coleta
 * (60s): custam uma fração do que custaria o mesmo número derivado de log, e
 * não dependem do caminho do Fluent Bit para chegar.
 *
 * Consulta: `FROM Metric SELECT count(newrelic.timeslice.value)
 *            WHERE metricTimesliceName = 'Custom/<nome>'`.
 */
export function incrementarMetrica(nome: string, valor = 1): void {
  comAgente((a) => a.incrementMetric?.(nome, valor));
}

/** Registra uma amostra; `average(newrelic.timeslice.value)` devolve a média. */
export function registrarMetrica(nome: string, valor: number): void {
  if (!Number.isFinite(valor)) return;

  comAgente((a) => a.recordMetric?.(nome, valor));
}

/**
 * Leva o erro para o Errors Inbox do APM, preso ao trace da requisição. Sem
 * isto, uma exceção tratada pelo filtro global do Nest chega ao APM só como
 * "HTTP 500", sem classe nem stack.
 */
export function notificarErro(
  erro: unknown,
  atributos: AtributosErro = {},
): void {
  const comoErro = erro instanceof Error ? erro : new Error(String(erro));

  comAgente((a) => a.noticeError?.(comoErro, atributos));
}

/**
 * Envia o que ainda está no buffer do agente antes de o processo sair. Com o
 * HPA removendo réplicas, sem isto cada scale-in descartaria até um ciclo de
 * coleta (60s) de métricas daquele pod — e a contagem de ordens criadas
 * passaria a depender de quando o autoscaler decidiu agir.
 */
export function encerrarAgente(timeoutMs = 5000): Promise<void> {
  const carregado = carregarAgente();

  if (!carregado?.shutdown) return Promise.resolve();

  return new Promise((resolve) => {
    // Rede de segurança: se o callback nunca vier, o pod não fica preso até o
    // SIGKILL do fim do grace period esperando telemetria.
    const limite = setTimeout(resolve, timeoutMs + 1000);
    limite.unref();

    const concluir = () => {
      clearTimeout(limite);
      resolve();
    };

    try {
      carregado.shutdown!(
        { collectPendingData: true, timeout: timeoutMs },
        concluir,
      );
    } catch {
      concluir();
    }
  });
}

/** Usado apenas nos testes, para reavaliar a variável de ambiente. */
export function redefinirAgenteParaTestes(): void {
  agente = undefined;
}
