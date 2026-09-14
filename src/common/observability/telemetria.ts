import type { PinoLogger } from 'nestjs-pino';

/**
 * Eventos de negócio saem pelo mesmo logger das requisições, e não por um
 * segundo canal: assim herdam de graça o `correlationId` da requisição em curso
 * (que o pino-http prende ao logger filho) e os campos de trace do New Relic
 * (injetados pelo `mixin` configurado no AppModule).
 *
 * O `PinoLogger` do nestjs-pino resolve, a cada chamada, o logger da requisição
 * corrente via AsyncLocalStorage — por isso guardar a instância aqui não
 * congela contexto nenhum. É essa indireção que evita ter de injetar o logger
 * no construtor de todo caso de uso só para registrar um evento.
 *
 * Sem `configurarTelemetria` (que roda no bootstrap), tudo vira no-op: é o que
 * mantém a saída dos testes unitários limpa sem precisar de mock.
 */
let registrador: PinoLogger | undefined;

export function configurarTelemetria(logger: PinoLogger): void {
  registrador = logger;
}

export function redefinirTelemetria(): void {
  registrador = undefined;
}

export type NivelEvento = 'info' | 'warn';

/**
 * Evento de negócio. O nome é hierárquico (`dominio.acao`) porque os painéis
 * filtram por prefixo — `WHERE evento LIKE 'ordem_servico.%'`.
 *
 * Convenção dos campos de dados: `snake_case`, para casar com o jeito que a
 * consulta NRQL os referencia. Nada de CPF ou placa: o log sai do cluster para
 * um serviço externo, e nenhuma pergunta do dashboard precisa de dado pessoal.
 */
export function registrarEvento(
  evento: string,
  dados: Record<string, unknown> = {},
  nivel: NivelEvento = 'info',
): void {
  registrador?.[nivel]({ evento, ...dados }, evento);
}

export function registrarFalha(
  evento: string,
  erro: unknown,
  dados: Record<string, unknown> = {},
): void {
  registrador?.error(
    { evento, ...camposDeErro(erro), ...dados },
    erro instanceof Error ? erro.message : String(erro),
  );
}

/**
 * `error.message`, `error.class` e `error.stack` são os nomes que o New Relic
 * reconhece para ligar uma linha de log ao erro correspondente no APM. O
 * serializador padrão do pino aninharia tudo sob `err`, que não é lido.
 */
function camposDeErro(erro: unknown): Record<string, string> {
  if (!(erro instanceof Error)) {
    return { 'error.message': String(erro) };
  }

  return {
    'error.message': erro.message,
    'error.class': erro.name,
    ...(erro.stack ? { 'error.stack': erro.stack } : {}),
  };
}
