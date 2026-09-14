export type TagsObservabilidade = Record<string, string>;

/**
 * Tags padrão do projeto em toda telemetria: `environment` e `project`.
 *
 * A fonte é `NEW_RELIC_LABELS` — a mesma variável que o agente de APM lê para
 * marcar a entidade. Um valor só governa as tags da entidade no APM e os
 * atributos de cada linha de log, e não há como os dois lados divergirem.
 *
 * Formato do agente: `chave:valor;chave:valor`. Pares malformados são
 * ignorados em vez de derrubar a subida: tag errada é problema de painel, não
 * de disponibilidade.
 */
export function tagsDeObservabilidade(
  labels: string | undefined = process.env.NEW_RELIC_LABELS,
): TagsObservabilidade {
  const tags: TagsObservabilidade = {};

  for (const par of (labels ?? '').split(';')) {
    const separador = par.indexOf(':');
    if (separador <= 0) continue;

    const chave = par.slice(0, separador).trim();
    const valor = par.slice(separador + 1).trim();

    if (chave && valor) tags[chave] = valor;
  }

  return tags;
}
