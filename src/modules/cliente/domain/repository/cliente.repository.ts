import { Cliente } from '../entity/Client';

export interface ClientRepository {
  getOne(id: string): Promise<Cliente | null>;

  getAllClient(): Promise<{ client: Cliente[]; count: number }>;

  createClient(client: Cliente): Promise<Cliente>;

  getByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<Cliente | null>;

  updateClient(id: string, client: Cliente): Promise<Cliente>;

  deleteClient(id: string): Promise<void>;
}
