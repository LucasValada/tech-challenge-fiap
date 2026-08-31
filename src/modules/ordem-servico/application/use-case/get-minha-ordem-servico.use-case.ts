import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';

/**
 * Detalhe de UMA ordem de serviço do cliente autenticado por CPF. O `clienteId`
 * vem do token emitido pela Lambda (payload.sub); a OS só é retornada se
 * pertencer a esse cliente — caso contrário responde 404, para não revelar a
 * existência de ordens de serviço de terceiros.
 */
@Injectable()
export class GetMinhaOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    clienteId: string,
    ordemId: string,
  ): Promise<OrdemServicoDetalhadaView> {
    const ordem =
      await this.ordemServicoRepository.findByIdComDetalhes(ordemId);

    if (!ordem || ordem.cliente.id !== clienteId) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    return ordem;
  }
}
