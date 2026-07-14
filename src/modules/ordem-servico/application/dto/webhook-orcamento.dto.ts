import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

const CODIGO_OS_REGEX = /^OS-\d{4}-\d{6}$/;

const STATUS_OS_VALUES: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
];

export class WebhookOrcamentoDto {
  @ApiProperty({
    description: 'Código da OS no formato OS-YYYY-NNNNNN',
    example: 'OS-2026-000001',
  })
  @IsString()
  @Matches(CODIGO_OS_REGEX, {
    message: 'codigoOS deve estar no formato OS-YYYY-NNNNNN',
  })
  codigoOS!: string;

  @ApiProperty({
    description: 'true para aprovação, false para recusa do orçamento',
    example: true,
  })
  @IsBoolean()
  aprovado!: boolean;
}

export class WebhookOrcamentoResponseDto {
  @ApiProperty({
    description: 'Código da OS afetada',
    example: 'OS-2026-000001',
  })
  codigo!: string;

  @ApiProperty({
    description:
      'Status resultante após processar a decisão (EM_EXECUCAO se aprovado, EM_DIAGNOSTICO se recusado)',
    example: 'EM_EXECUCAO',
    enum: STATUS_OS_VALUES,
  })
  status!: StatusOrdemServico;
}
