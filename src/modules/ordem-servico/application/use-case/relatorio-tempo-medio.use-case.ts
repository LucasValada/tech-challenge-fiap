import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import {
  RelatorioTempoMedioQueryDto,
  RelatorioTempoMedioResponseDto,
} from '../dto/relatorio-tempo-medio.dto';

@Injectable()
export class RelatorioTempoMedioUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    query: RelatorioTempoMedioQueryDto,
  ): Promise<RelatorioTempoMedioResponseDto> {
    const dataInicio = query.dataInicio
      ? new Date(query.dataInicio)
      : undefined;
    const dataFim = query.dataFim
      ? this.fimDoDia(new Date(query.dataFim))
      : undefined;

    if (dataInicio && dataFim && dataInicio.getTime() > dataFim.getTime()) {
      throw new BadRequestException(
        'dataInicio não pode ser posterior a dataFim',
      );
    }

    const relatorio =
      await this.ordemServicoRepository.getRelatorioTempoMedioPorServico({
        dataInicio,
        dataFim,
        servicoId: query.servicoId,
      });

    return {
      periodo: {
        dataInicio: query.dataInicio ?? null,
        dataFim: query.dataFim ?? null,
      },
      totalOrdensConsideradas: relatorio.totalOrdensConsideradas,
      servicos: relatorio.servicos,
    };
  }

  private fimDoDia(data: Date): Date {
    const ajustada = new Date(data);
    ajustada.setUTCHours(23, 59, 59, 999);
    return ajustada;
  }
}
