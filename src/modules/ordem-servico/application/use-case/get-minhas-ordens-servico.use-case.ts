import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';

/**
 * Lista as ordens de serviço do cliente autenticado por CPF. O `clienteId` vem
 * do token emitido pela Lambda (payload.sub), garantindo que o cliente só
 * enxerga as próprias OS.
 */
@Injectable()
export class GetMinhasOrdensServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    clienteId: string,
  ): Promise<{ ordens: OrdemServico[]; count: number }> {
    return this.ordemServicoRepository.findByClienteId(clienteId);
  }
}
