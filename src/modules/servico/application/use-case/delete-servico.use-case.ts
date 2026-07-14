import { Inject, Injectable } from '@nestjs/common';
import { ServicoRepository } from '../../domain/repository/servico.repository';
import { buscarServicoOuFalhar } from '../../domain/services/buscarServicoOuFalhar';

@Injectable()
export class DeleteServicoUseCase {
  constructor(
    @Inject('SERVICO_REPOSITORY')
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await buscarServicoOuFalhar(this.servicoRepository, id);
    await this.servicoRepository.delete(id);
  }
}
