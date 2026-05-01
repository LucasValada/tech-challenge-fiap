import { Servico } from '../entity/Servico';

export const SERVICO_REPOSITORY = 'SERVICO_REPOSITORY';

export interface ServicoRepository {
  create(data: {
    nome: string;
    descricao?: string;
    precoBase: number;
    tempoEstimadoMin: number;
  }): Promise<Servico>;

  findAll(): Promise<Servico[]>;

  findById(id: string): Promise<Servico | null>;

  update(
    id: string,
    data: {
      nome?: string;
      descricao?: string;
      precoBase?: number;
      tempoEstimadoMin?: number;
    },
  ): Promise<Servico>;

  delete(id: string): Promise<Servico>;
}
