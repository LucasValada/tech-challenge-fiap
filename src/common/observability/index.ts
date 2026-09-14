export {
  encerrarAgente,
  incrementarMetrica,
  metadadosDeTrace,
  notificarErro,
  redefinirAgenteParaTestes,
  registrarMetrica,
} from './newrelic';
export type { AtributosErro, MetadadosTrace } from './newrelic';

export { tagsDeObservabilidade } from './tags';
export type { TagsObservabilidade } from './tags';

export {
  configurarTelemetria,
  redefinirTelemetria,
  registrarEvento,
  registrarFalha,
} from './telemetria';
export type { NivelEvento } from './telemetria';
