import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';

@Injectable()
export class GetOrdemServicoByIdUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(id: string): Promise<OrdemServicoDetalhadaView> {
    const ordem = await this.ordemServicoRepository.findByIdComDetalhes(id);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return ordem;
  }
}
