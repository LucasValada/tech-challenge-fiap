import { OrdemServico, StatusOrdemServico } from '../entity/OrdemServico';
import { LinhasTravadasError, OSImutavelError } from '../errors';

/** Status em que o mecânico lança serviços e itens: antes e durante o diagnóstico. */
export const STATUS_COM_LINHAS_EDITAVEIS: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
];

/**
 * Serviços e itens só podem ser lançados ou alterados até o diagnóstico ser
 * concluído. Depois disso o orçamento foi gerado com aquela cópia, e mudar faria
 * o cliente aprovar e pagar um valor diferente do total da OS
 * (docs/contratos.md, seção 6). Substitui a regra da Fase 3, que permitia editar
 * também em AGUARDANDO_APROVACAO.
 *
 * O repositório confere a trava de novo dentro da transação da edição, para o
 * caso de a conclusão do diagnóstico chegar no meio.
 */
export function garantirLinhasEditaveis(ordem: OrdemServico): void {
  if (ordem.diagnosticoConcluidoAt) throw new LinhasTravadasError();
  if (!STATUS_COM_LINHAS_EDITAVEIS.includes(ordem.status)) {
    throw new OSImutavelError(ordem.status);
  }
}
