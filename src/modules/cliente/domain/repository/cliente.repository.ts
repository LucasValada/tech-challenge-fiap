import { Cliente } from '../entity/Cliente';

export interface CreateClienteData {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpfCnpj: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';
}

export interface UpdateClienteData {
  nome?: string;
  telefone?: string | null;
  email?: string | null;
  cpfCnpj?: string;
  tipoPessoa?: 'FISICA' | 'JURIDICA';
}

export interface ClienteRepository {
  create(data: CreateClienteData): Promise<Cliente>;
  findAll(): Promise<{ cliente: Cliente[]; count: number }>;
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<Cliente | null>;
  update(id: string, data: UpdateClienteData): Promise<Cliente>;
  delete(id: string): Promise<Cliente>;
}
