import { Inject, Injectable } from '@nestjs/common';
import { ServicoRepository } from '../../domain/repository/servico.repository';
import { Servico } from '../../domain/entity/Servico';

@Injectable()
export class GetAllServicosUseCase {
  constructor(
    @Inject('SERVICO_REPOSITORY')
    private readonly servicoRepository: ServicoRepository,
  ) {}

  execute(): Promise<{ servico: Servico[]; count: number }> {
    return this.servicoRepository.findAll();
  }
}
