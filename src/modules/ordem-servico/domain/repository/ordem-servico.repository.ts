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

export interface OrdemServicoRepository {
  findAll(): Promise<{ ordens: OrdemServico[]; count: number }>;

  findById(id: string): Promise<OrdemServico | null>;

  findByCodigo(codigo: string): Promise<OrdemServico | null>;

  create(data: CreateOrdemServicoData): Promise<OrdemServico>;

  update(id: string, data: UpdateOrdemServicoData): Promise<OrdemServico>;

  delete(id: string): Promise<void>;
}
