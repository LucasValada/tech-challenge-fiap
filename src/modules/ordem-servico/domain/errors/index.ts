export class ClienteNaoEncontradoError extends Error {
  name = 'ClienteNaoEncontradoError';
  constructor(public cpfCnpj: string) {
    super('Cliente com CPF/CNPJ informado não cadastrado');
  }
}

export class VeiculoNaoEncontradoError extends Error {
  name = 'VeiculoNaoEncontradoError';
  constructor(public placa: string) {
    super('Veículo com placa informada não encontrado');
  }
}

export class VeiculoNaoPertenceAoClienteError extends Error {
  name = 'VeiculoNaoPertenceAoClienteError';
  constructor(
    public placa: string,
    public cpfCnpj: string,
  ) {
    super('Veículo informado não pertence ao cliente');
  }
}

export class ServicoIndisponivelError extends Error {
  name = 'ServicoIndisponivelError';
  constructor(public servicoId: string) {
    super(`Serviço ${servicoId} indisponível`);
  }
}

export class ItemEstoqueIndisponivelError extends Error {
  name = 'ItemEstoqueIndisponivelError';
  constructor(public itemEstoqueId: string) {
    super(`Item de estoque ${itemEstoqueId} indisponível`);
  }
}

export class EstoqueInsuficienteError extends Error {
  name = 'EstoqueInsuficienteError';
  constructor(
    public nomeItem: string,
    public disponivel: number,
    public solicitado: number,
  ) {
    super(
      `Estoque insuficiente para ${nomeItem} (disponível: ${disponivel}, solicitado: ${solicitado})`,
    );
  }
}

export class LinhaNaoEncontradaError extends Error {
  name = 'LinhaNaoEncontradaError';
  constructor(public linhaId: string) {
    super(`Linha ${linhaId} não encontrada na OS`);
  }
}

export class OSImutavelError extends Error {
  name = 'OSImutavelError';
  constructor(public statusAtual: string) {
    super(`Não é possível modificar OS em status ${statusAtual}`);
  }
}

/**
 * As linhas foram travadas na conclusão do diagnóstico: o orçamento foi gerado
 * com aquela cópia, e mudar depois faria o cliente aprovar e pagar um valor
 * diferente do total da OS (docs/contratos.md, seção 6).
 */
export class LinhasTravadasError extends Error {
  name = 'LinhasTravadasError';
  constructor() {
    super(
      'Serviços e itens não podem mais ser alterados: o diagnóstico foi concluído e o orçamento foi gerado com eles',
    );
  }
}

/** O status da OS mudou entre a leitura e a gravação (outra ação chegou antes). */
export class OrdemServicoAlteradaError extends Error {
  name = 'OrdemServicoAlteradaError';
  constructor(
    public ordemId: string,
    public statusEsperados: string[],
  ) {
    super(
      `A OS ${ordemId} não está mais em ${statusEsperados.join(' ou ')}: outra ação chegou antes`,
    );
  }
}

export class TransicaoInvalidaError extends Error {
  name = 'TransicaoInvalidaError';
  constructor(
    public de: string,
    public para: string,
  ) {
    super(`Transição ${de} → ${para} não permitida`);
  }
}

/** Cancelamento pelo funcionário fora dos status em que a OS espera o cliente. */
export class CancelamentoNaoPermitidoError extends Error {
  name = 'CancelamentoNaoPermitidoError';
  constructor(public statusAtual: string) {
    super(
      `O funcionário só cancela OS em AGUARDANDO_APROVACAO ou AGUARDANDO_PAGAMENTO (status atual: ${statusAtual}); ` +
        'nos status em que o mecânico atua, a falha é registrada pela rota falhar do Execution',
    );
  }
}

/**
 * Só uma OS cancelada pode ser excluída: no meio da Saga, a exclusão deixaria
 * orçamento, pagamento e tarefas órfãos nos outros serviços.
 */
export class OSNaoCanceladaError extends Error {
  name = 'OSNaoCanceladaError';
  constructor(public statusAtual: string) {
    super(
      `Só uma OS CANCELADA pode ser excluída (status atual: ${statusAtual})`,
    );
  }
}
