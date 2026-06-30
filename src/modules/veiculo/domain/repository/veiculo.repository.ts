import { Veiculo } from '../entity/Veiculo';

export interface CreateVeiculoData {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  clienteId: string;
}

export interface UpdateVeiculoData {
  placa?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
}

export interface VeiculoRepository {
  create(data: CreateVeiculoData): Promise<Veiculo>;
  findAll(): Promise<{ veiculo: Veiculo[]; count: number }>;
  findById(id: string): Promise<Veiculo | null>;
  findByPlaca(placa: string, excludeId?: string): Promise<Veiculo | null>;
  update(id: string, data: UpdateVeiculoData): Promise<Veiculo>;
  delete(id: string): Promise<Veiculo>;
}
