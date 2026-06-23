import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../domain/repository/servico.repository';
import { FindByIdServicoUseCase } from './findByIdServico.use-case';

@Injectable()
export class DeleteServicoUseCase {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
    private readonly findByIdUseCase: FindByIdServicoUseCase,
  ) {}

  async execute(id: string): Promise<void> {
    await this.findByIdUseCase.execute(id);
    await this.servicoRepository.delete(id);
  }
}
