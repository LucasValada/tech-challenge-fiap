import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { UpdateOrdemServicoDto } from '../dto/ordem-servico.dto';

@Injectable()
export class UpdateOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(id: string, dto: UpdateOrdemServicoDto): Promise<OrdemServico> {
    await buscarOrdemServicoOuFalhar(this.ordemServicoRepository, id);
    return this.ordemServicoRepository.update(id, {
      observacoes: dto.observacoes,
    });
  }
}
