import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import { PublicOrdemServicoResponseDto } from '../dto/public-ordem-servico.dto';

@Injectable()
export class PublicOrdemServicoService {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async consultar(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoResponseDto> {
    const codigoNormalizado = codigo.trim().toUpperCase();
    const placaNormalizada = placa.trim().toUpperCase();

    const view = await this.ordemServicoRepository.findPublicByCodigoEPlaca(
      codigoNormalizado,
      placaNormalizada,
    );

    if (!view) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    return view;
  }
}
