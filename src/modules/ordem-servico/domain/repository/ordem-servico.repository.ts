import { OrdemServico, StatusOrdemServico } from '../entity/OrdemServico';

export const ORDEM_SERVICO_REPOSITORY = 'ORDEM_SERVICO_REPOSITORY';

export interface CreateOrdemServicoData {
  codigo: string;
  clienteId: string;
  veiculoId: string;
  usuarioCriadorId: string;
  observacoes: string | null;
}

export interface UpdateOrdemServicoData {
  observacoes?: string | null;
  status?: StatusOrdemServico;
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

export interface OrdemServicoRepository {
  findAll(): Promise<{ ordens: OrdemServico[]; count: number }>;

  findById(id: string): Promise<OrdemServico | null>;

  findByCodigo(codigo: string): Promise<OrdemServico | null>;

  findPublicByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView | null>;

  create(data: CreateOrdemServicoData): Promise<OrdemServico>;

  update(id: string, data: UpdateOrdemServicoData): Promise<OrdemServico>;

  delete(id: string): Promise<void>;
}
