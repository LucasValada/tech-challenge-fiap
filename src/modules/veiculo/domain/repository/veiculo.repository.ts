import { Veiculo } from '../entity/Veiculo';

export const VEICULO_REPOSITORY = 'VEICULO_REPOSITORY';

export interface VeiculoRepository {
  create(data: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
    clienteId: string;
  }): Promise<Veiculo>;

  findAll(): Promise<Veiculo[]>;

  findById(id: string): Promise<Veiculo | null>;

  findByPlaca(placa: string): Promise<Veiculo | null>;

  update(
    id: string,
    data: {
      placa?: string;
      marca?: string;
      modelo?: string;
      ano?: number;
    },
  ): Promise<Veiculo>;

  delete(id: string): Promise<Veiculo>;
}
