import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../domain/repository/servico.repository';

@Injectable()
export class FindAllServicoUseCase {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async execute() {
    return this.servicoRepository.findAll();
  }
}
