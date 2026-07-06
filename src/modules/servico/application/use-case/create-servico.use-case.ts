import { Inject, Injectable } from '@nestjs/common';
import {
  CreateServicoData,
  ServicoRepository,
} from '../../domain/repository/servico.repository';
import { Servico } from '../../domain/entity/Servico';

@Injectable()
export class CreateServicoUseCase {
  constructor(
    @Inject('SERVICO_REPOSITORY')
    private readonly servicoRepository: ServicoRepository,
  ) {}

  execute(data: CreateServicoData): Promise<Servico> {
    return this.servicoRepository.create(data);
  }
}
