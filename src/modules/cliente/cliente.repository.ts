import { Cliente } from './domain/entity/Client';
import { clientDto } from './application/dto/client.dto';

export interface ClientRepository {
  getOne(id: string): Promise<Cliente | null>;

  getAllClient(): Promise<{ client: Cliente[]; count: number }>;

  createClient(client: clientDto): Promise<Cliente>;

  getByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<Cliente | null>;

  updateClient(id: string, client: clientDto): Promise<Cliente>;

  deleteClient(id: string): Promise<void>;
}
