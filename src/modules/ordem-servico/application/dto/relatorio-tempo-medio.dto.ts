import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class RelatorioTempoMedioQueryDto {
  @ApiPropertyOptional({
    description:
      'Data inicial do período (ISO 8601). Aplicada sobre OrdemServico.finalizadaAt.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description:
      'Data final do período (ISO 8601). Aplicada sobre OrdemServico.finalizadaAt (inclusiva, fim do dia).',
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Filtra o relatório para um único serviço.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  servicoId?: string;
}

export class RelatorioTempoMedioPeriodoDto {
  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  dataInicio!: string | null;

  @ApiPropertyOptional({ example: '2026-04-30', nullable: true })
  dataFim!: string | null;
}

export class RelatorioTempoMedioItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  servicoId!: string;

  @ApiProperty({ example: 'Troca de óleo' })
  nome!: string;

  @ApiProperty({ example: 30, description: 'Tempo estimado cadastrado (min).' })
  tempoEstimadoMin!: number;

  @ApiProperty({
    example: 12,
    description:
      'Quantidade de ordens de serviço finalizadas que continham o serviço.',
  })
  quantidadeOS!: number;

  @ApiProperty({ example: 145.5, description: 'Tempo médio em minutos.' })
  tempoMedioMinutos!: number;

  @ApiProperty({ example: 30 })
  tempoMinimoMinutos!: number;

  @ApiProperty({ example: 480 })
  tempoMaximoMinutos!: number;
}

export class RelatorioTempoMedioResponseDto {
  @ApiProperty({ type: RelatorioTempoMedioPeriodoDto })
  periodo!: RelatorioTempoMedioPeriodoDto;

  @ApiProperty({
    example: 27,
    description:
      'Total de ordens de serviço distintas consideradas no relatório.',
  })
  totalOrdensConsideradas!: number;

  @ApiProperty({ type: [RelatorioTempoMedioItemDto] })
  servicos!: RelatorioTempoMedioItemDto[];
}
