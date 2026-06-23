import { Inject, Injectable } from '@nestjs/common';
import { CreateServicoDto } from '../dto';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../domain/repository/servico.repository';

@Injectable()
export class CreateServicoUseCase {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async execute(dto: CreateServicoDto) {
    return this.servicoRepository.create(dto);
  }
}
