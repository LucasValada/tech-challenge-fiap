import { Servico } from '../entity/Servico';

export interface CreateServicoData {
  nome: string;
  descricao?: string;
  precoBase: number;
  tempoEstimadoMin: number;
}

export interface UpdateServicoData {
  nome?: string;
  descricao?: string;
  precoBase?: number;
  tempoEstimadoMin?: number;
}

export interface ServicoRepository {
  create(data: CreateServicoData): Promise<Servico>;
  findAll(): Promise<{ servico: Servico[]; count: number }>;
  findById(id: string): Promise<Servico | null>;
  update(id: string, data: UpdateServicoData): Promise<Servico>;
  delete(id: string): Promise<Servico>;
}
