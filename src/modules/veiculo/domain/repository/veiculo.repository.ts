import { Cliente } from '../../../cliente/domain/entity/Cliente';
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

export type VeiculoComCliente = Veiculo & { cliente: Cliente };

export interface VeiculoRepository {
  create(data: CreateVeiculoData): Promise<Veiculo>;
  findAll(): Promise<{ veiculo: VeiculoComCliente[]; count: number }>;
  findById(id: string): Promise<VeiculoComCliente | null>;
  findByPlaca(placa: string, excludeId?: string): Promise<Veiculo | null>;
  update(id: string, data: UpdateVeiculoData): Promise<VeiculoComCliente>;
  delete(id: string): Promise<Veiculo>;
}
