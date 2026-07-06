import { Inject, Injectable } from '@nestjs/common';
import { ServicoRepository } from '../../domain/repository/servico.repository';
import { Servico } from '../../domain/entity/Servico';
import { buscarServicoOuFalhar } from '../../domain/services/buscarServicoOuFalhar';

@Injectable()
export class GetServicoByIdUseCase {
  constructor(
    @Inject('SERVICO_REPOSITORY')
    private readonly servicoRepository: ServicoRepository,
  ) {}

  execute(id: string): Promise<Servico> {
    return buscarServicoOuFalhar(this.servicoRepository, id);
  }
}
