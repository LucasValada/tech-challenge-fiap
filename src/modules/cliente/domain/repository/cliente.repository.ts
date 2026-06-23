import { Cliente } from '../entity/Client';
import { ClientDto } from '../../application/dto/client.dto';

export interface ClientRepository {
  getOne(id: string): Promise<Cliente | null>;

  getAllClient(): Promise<{ client: Cliente[]; count: number }>;

  createClient(client: ClientDto): Promise<Cliente>;

  getByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<Cliente | null>;

  updateClient(id: string, client: ClientDto): Promise<Cliente>;

  deleteClient(id: string): Promise<void>;
}
