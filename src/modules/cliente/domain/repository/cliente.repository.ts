import { Cliente } from '../entity/Cliente';

export interface ClienteRepository {
  getOne(id: string): Promise<Cliente | null>;

  getAllCliente(): Promise<{ cliente: Cliente[]; count: number }>;

  createCliente(client: Cliente): Promise<Cliente>;

  getByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<Cliente | null>;

  updateCliente(id: string, client: Cliente): Promise<Cliente>;

  deleteCliente(id: string): Promise<void>;
}
