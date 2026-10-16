import { OrdemServico, StatusOrdemServico } from '../entity/OrdemServico';
import { OSServicoLinha } from '../entity/OSServicoLinha';
import { OSItemEstoqueLinha } from '../entity/OSItemEstoqueLinha';

export interface CreateOrdemServicoComItensData {
  /** Fluxo da OS na Saga (docs/contratos.md, seção 1). */
  correlationId: string;
  clienteId: string;
  veiculoId: string;
  usuarioCriadorId: string;
  observacoes: string | null;
  servicos: { servicoId: string; quantidade: number }[];
  itens: { itemEstoqueId: string; quantidade: number }[];
}

export interface AdicionarServicoData {
  servicoId: string;
  quantidade: number;
}

export interface AdicionarItemEstoqueData {
  itemEstoqueId: string;
  quantidade: number;
}

/**
 * Roda dentro da transação, depois das gravações e antes do commit: é onde a
 * Saga publica a mensagem. Se lançar, nada é gravado (docs/contratos.md,
 * "gravar e publicar na mesma transação").
 */
export type AntesDoCommit<T> = (dados: T) => Promise<void>;

/** Tipo da transição, para a telemetria; as compensações da Saga são COMPENSACAO. */
export type TipoTransicaoOS = 'AVANCO' | 'ROLLBACK' | 'COMPENSACAO';

export interface OpcoesTransicao {
  /**
   * Só transiciona se a OS ainda estiver num destes status (concorrência
   * otimista). Se outra ação mudou a OS antes, lança OrdemServicoAlteradaError e
   * nada é gravado.
   */
  statusEsperados?: StatusOrdemServico[];
  /** Compensação: devolve ao estoque as quantidades dos itens da OS. */
  devolverEstoque?: boolean;
  /** Gravado quando a transição é para CANCELADA. */
  motivoCancelamento?: string;
  antesDoCommit?: AntesDoCommit<OrdemServico>;
}

/** Cópia das linhas e do cliente que vai no comando GerarOrcamento. */
export interface SnapshotOrcamento {
  ordem: OrdemServico;
  cliente: { id: string; nome: string; email: string | null };
  servicos: {
    servicoId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    subtotal: number;
  }[];
  itens: {
    itemEstoqueId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    subtotal: number;
  }[];
}

export interface UpdateOrdemServicoData {
  observacoes?: string | null;
}

export interface OrdemServicoDetalhadaHistoricoView {
  status: StatusOrdemServico;
  observacao: string | null;
  createdAt: Date;
  usuarioId: string;
  usuario: { nome: string } | null;
}

export interface OrdemServicoDetalhadaLinhaServicoView {
  id: string;
  servicoId: string;
  nomeSnapshot: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
  createdAt: Date;
}

export interface OrdemServicoDetalhadaLinhaItemView {
  id: string;
  itemEstoqueId: string;
  nomeSnapshot: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
  createdAt: Date;
}

export interface OrdemServicoDetalhadaView {
  id: string;
  codigo: string;
  status: StatusOrdemServico;
  observacoes: string | null;
  valorServicos: number;
  valorPecas: number;
  valorTotal: number;
  createdAt: Date;
  updatedAt: Date;
  finalizadaAt: Date | null;
  entregueAt: Date | null;
  correlationId: string;
  diagnosticoConcluidoAt: Date | null;
  canceladaAt: Date | null;
  motivoCancelamento: string | null;
  cliente: { id: string; nome: string; cpfCnpj: string };
  veiculo: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
  };
  usuarioCriador: { id: string; nome: string };
  servicos: OrdemServicoDetalhadaLinhaServicoView[];
  itens: OrdemServicoDetalhadaLinhaItemView[];
  historicoStatus: OrdemServicoDetalhadaHistoricoView[];
}

export interface PublicOrdemServicoItemView {
  nomeSnapshot: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

export interface PublicHistoricoStatusView {
  status: StatusOrdemServico;
  observacao: string | null;
  createdAt: Date;
}

export interface PublicOrdemServicoView {
  codigo: string;
  status: StatusOrdemServico;
  observacoes: string | null;
  valorServicos: number;
  valorPecas: number;
  valorTotal: number;
  createdAt: Date;
  finalizadaAt: Date | null;
  entregueAt: Date | null;
  cliente: { nome: string };
  veiculo: { placa: string; marca: string; modelo: string; ano: number };
  servicos: PublicOrdemServicoItemView[];
  itens: PublicOrdemServicoItemView[];
  historicoStatus: PublicHistoricoStatusView[];
}

export interface RelatorioTempoMedioFiltros {
  dataInicio?: Date;
  dataFim?: Date;
  servicoId?: string;
}

export interface TempoMedioServicoView {
  servicoId: string;
  nome: string;
  tempoEstimadoMin: number;
  quantidadeOS: number;
  tempoMedioMinutos: number;
  tempoMinimoMinutos: number;
  tempoMaximoMinutos: number;
}

export interface RelatorioTempoMedioView {
  totalOrdensConsideradas: number;
  servicos: TempoMedioServicoView[];
}

export interface OrdemServicoRepository {
  findAll(): Promise<{ ordens: OrdemServico[]; count: number }>;

  findByClienteId(
    clienteId: string,
  ): Promise<{ ordens: OrdemServico[]; count: number }>;

  findById(id: string): Promise<OrdemServico | null>;

  findByIdComDetalhes(id: string): Promise<OrdemServicoDetalhadaView | null>;

  findByCodigo(codigo: string): Promise<OrdemServico | null>;

  findPublicByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView | null>;

  /** Abre a OS; `antesDoCommit` publica o primeiro comando da Saga. */
  createComItens(
    data: CreateOrdemServicoComItensData,
    antesDoCommit?: AntesDoCommit<OrdemServico>,
  ): Promise<OrdemServico>;

  update(id: string, data: UpdateOrdemServicoData): Promise<OrdemServico>;

  delete(id: string): Promise<void>;

  adicionarServico(
    ordemId: string,
    data: AdicionarServicoData,
  ): Promise<OSServicoLinha>;

  removerServico(ordemId: string, linhaId: string): Promise<void>;

  atualizarQuantidadeServico(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSServicoLinha>;

  adicionarItemEstoque(
    ordemId: string,
    data: AdicionarItemEstoqueData,
  ): Promise<OSItemEstoqueLinha>;

  removerItemEstoque(ordemId: string, linhaId: string): Promise<void>;

  atualizarQuantidadeItemEstoque(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSItemEstoqueLinha>;

  transicionarStatus(
    ordemId: string,
    novoStatus: StatusOrdemServico,
    tipoTransicao: TipoTransicaoOS,
    usuarioId: string,
    observacao: string | null,
    opcoes?: OpcoesTransicao,
  ): Promise<OrdemServico>;

  /**
   * Registra um acontecimento no histórico sem mudar o status (por exemplo,
   * uma tentativa de pagamento recusada).
   */
  registrarNoHistorico(
    ordemId: string,
    usuarioId: string,
    observacao: string,
  ): Promise<void>;

  /**
   * Conclui o diagnóstico: trava as linhas e entrega a cópia delas a
   * `antesDoCommit`, que publica o pedido de orçamento. Só age com a OS em
   * EM_DIAGNOSTICO e as linhas ainda abertas; devolve false se já tinha sido
   * concluído (resposta repetida) ou se a OS não está nesse ponto.
   */
  concluirDiagnostico(
    ordemId: string,
    antesDoCommit: AntesDoCommit<SnapshotOrcamento>,
  ): Promise<boolean>;

  contarLinhas(ordemId: string): Promise<{ servicos: number; itens: number }>;

  findByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<OrdemServico | null>;

  getRelatorioTempoMedioPorServico(
    filtros: RelatorioTempoMedioFiltros,
  ): Promise<RelatorioTempoMedioView>;
}
