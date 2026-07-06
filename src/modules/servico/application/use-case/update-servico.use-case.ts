import { Inject, Injectable } from '@nestjs/common';
import {
  ServicoRepository,
  UpdateServicoData,
} from '../../domain/repository/servico.repository';
import { Servico } from '../../domain/entity/Servico';
import { buscarServicoOuFalhar } from '../../domain/services/buscarServicoOuFalhar';

@Injectable()
export class UpdateServicoUseCase {
  constructor(
    @Inject('SERVICO_REPOSITORY')
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async execute(id: string, data: UpdateServicoData): Promise<Servico> {
    await buscarServicoOuFalhar(this.servicoRepository, id);
    return this.servicoRepository.update(id, data);
  }
}
