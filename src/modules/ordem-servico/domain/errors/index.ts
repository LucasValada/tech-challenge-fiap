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

export class OSSemItensParaOrcamentoError extends Error {
  name = 'OSSemItensParaOrcamentoError';
  constructor() {
    super(
      'A OS precisa ter pelo menos um serviço ou peça/insumo para enviar o orçamento',
    );
  }
}

export class OSStatusInvalidoParaOrcamentoError extends Error {
  name = 'OSStatusInvalidoParaOrcamentoError';
  constructor(public statusAtual: string) {
    super(
      `O orçamento só pode ser enviado quando a OS está em EM_DIAGNOSTICO (status atual: ${statusAtual})`,
    );
  }
}

export class OSStatusInvalidoParaAprovacaoError extends Error {
  name = 'OSStatusInvalidoParaAprovacaoError';
  constructor(public statusAtual: string) {
    super(
      `O orçamento só pode ser aprovado quando a OS está em AGUARDANDO_APROVACAO (status atual: ${statusAtual})`,
    );
  }
}
