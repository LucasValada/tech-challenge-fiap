import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class RelatorioTempoMedioQueryDto {
  @ApiPropertyOptional({
    description:
      'Data inicial do período (ISO 8601). Aplicada sobre OrdemServico.finalizadaAt.',
    example: '2026-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description:
      'Data final do período (ISO 8601). Aplicada sobre OrdemServico.finalizadaAt (inclusiva, fim do dia).',
    example: '2026-04-30',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Filtra o relatório para um único serviço.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  servicoId?: string;
}

export class RelatorioTempoMedioPeriodoDto {
  @ApiPropertyOptional({
    description:
      'Data inicial do período aplicado no filtro (null se não foi informada)',
    example: '2026-01-01',
    format: 'date',
    nullable: true,
  })
  dataInicio!: string | null;

  @ApiPropertyOptional({
    description:
      'Data final do período aplicado no filtro (null se não foi informada)',
    example: '2026-04-30',
    format: 'date',
    nullable: true,
  })
  dataFim!: string | null;
}

export class RelatorioTempoMedioItemDto {
  @ApiProperty({
    description: 'Identificador (UUID) do serviço',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  servicoId!: string;

  @ApiProperty({
    description: 'Nome do serviço no cadastro',
    example: 'Troca de óleo',
  })
  nome!: string;

  @ApiProperty({
    description: 'Tempo estimado cadastrado (min).',
    example: 30,
  })
  tempoEstimadoMin!: number;

  @ApiProperty({
    description:
      'Quantidade de ordens de serviço finalizadas que continham o serviço.',
    example: 12,
  })
  quantidadeOS!: number;

  @ApiProperty({
    description:
      'Tempo médio real de execução em minutos (média entre createdAt e finalizadaAt das OS).',
    example: 145.5,
  })
  tempoMedioMinutos!: number;

  @ApiProperty({
    description:
      'Menor tempo de execução observado em minutos entre as OS consideradas',
    example: 30,
  })
  tempoMinimoMinutos!: number;

  @ApiProperty({
    description:
      'Maior tempo de execução observado em minutos entre as OS consideradas',
    example: 480,
  })
  tempoMaximoMinutos!: number;
}

export class RelatorioTempoMedioResponseDto {
  @ApiProperty({
    description: 'Período do relatório (ecoa os filtros aplicados)',
    type: RelatorioTempoMedioPeriodoDto,
  })
  periodo!: RelatorioTempoMedioPeriodoDto;

  @ApiProperty({
    example: 27,
    description:
      'Total de ordens de serviço distintas consideradas no relatório.',
  })
  totalOrdensConsideradas!: number;

  @ApiProperty({
    description: 'Estatísticas de tempo agrupadas por serviço',
    type: [RelatorioTempoMedioItemDto],
  })
  servicos!: RelatorioTempoMedioItemDto[];
}
