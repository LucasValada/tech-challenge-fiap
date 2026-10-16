import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';
import { normalizarCpfCnpj } from '../../domain/services/normalizarCpfCnpj';

export interface ClienteParaAutenticacao {
  id: string;
  nome: string;
  status: 'ATIVO' | 'INATIVO';
}

/**
 * Consulta usada pela Lambda de autenticação por CPF, que deixa de ler o banco
 * do OS Service (docs/contratos.md, seção 7). Devolve só o que a Lambda precisa
 * para emitir o token: o id (vira o `sub` do JWT), o nome e o status — a Lambda
 * recusa cliente INATIVO.
 */
@Injectable()
export class BuscarClientePorCpfUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(cpf: string): Promise<ClienteParaAutenticacao> {
    const cliente = await this.clienteRepository.findByCpfCnpj(
      normalizarCpfCnpj(cpf),
    );
    if (!cliente?.id) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return { id: cliente.id, nome: cliente.nome, status: cliente.status };
  }
}
