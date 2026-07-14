import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards';
import {
  RelatorioTempoMedioQueryDto,
  RelatorioTempoMedioResponseDto,
} from '../../application/dto/relatorio-tempo-medio.dto';
import { RelatorioTempoMedioUseCase } from '../../application/use-case/relatorio-tempo-medio.use-case';

@ApiTags('Ordens de Serviço - Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordens-servico/relatorios')
export class RelatorioOrdemServicoController {
  constructor(
    private readonly relatorioTempoMedioUseCase: RelatorioTempoMedioUseCase,
  ) {}

  @Get('tempo-medio-servicos')
  @ApiOperation({
    summary: 'Obter tempo médio de execução por tipo de serviço',
    description:
      'Calcula o tempo médio (em minutos) entre createdAt e finalizadaAt das ordens de serviço, agrupado por tipo de serviço. Considera apenas OS com finalizadaAt preenchido.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: RelatorioTempoMedioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos (ex.: dataInicio > dataFim)',
  })
  async tempoMedioServicos(
    @Query() query: RelatorioTempoMedioQueryDto,
  ): Promise<RelatorioTempoMedioResponseDto> {
    return this.relatorioTempoMedioUseCase.execute(query);
  }
}
