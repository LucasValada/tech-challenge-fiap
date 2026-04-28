import { OrdemServico, StatusOrdemServico } from '../entity/OrdemServico';
import { OSServicoLinha } from '../entity/OSServicoLinha';
import { OSItemEstoqueLinha } from '../entity/OSItemEstoqueLinha';

export const ORDEM_SERVICO_REPOSITORY = 'ORDEM_SERVICO_REPOSITORY';

export interface CreateOrdemServicoComItensData {
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

  findById(id: string): Promise<OrdemServico | null>;

  findByIdComDetalhes(id: string): Promise<OrdemServicoDetalhadaView | null>;

  findByCodigo(codigo: string): Promise<OrdemServico | null>;

  findPublicByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView | null>;

  createComItens(data: CreateOrdemServicoComItensData): Promise<OrdemServico>;

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
    tipoTransicao: 'AVANCO' | 'ROLLBACK',
    usuarioId: string,
    observacao: string | null,
  ): Promise<OrdemServico>;

  getRelatorioTempoMedioPorServico(
    filtros: RelatorioTempoMedioFiltros,
  ): Promise<RelatorioTempoMedioView>;
}
