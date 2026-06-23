import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../domain/repository/servico.repository';
import { FindByIdServicoUseCase } from './findByIdServico.use-case';
import { UpdateServicoDto } from '../dto';

@Injectable()
export class UpdateServicoUseCase {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
    private readonly findByIdUseCase: FindByIdServicoUseCase,
  ) {}

  async execute(id: string, dto: UpdateServicoDto) {
    await this.findByIdUseCase.execute(id);
    return this.servicoRepository.update(id, dto);
  }
}
