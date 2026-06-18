import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';

const CODIGO_OS_REGEX = /^OS-\d{4}-\d{6}$/;

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
  @ApiProperty({ example: 'OS-2026-000001' })
  codigo!: string;

  @ApiProperty({
    example: 'EM_EXECUCAO',
    description: 'Status resultante após processar a decisão',
  })
  status!: string;
}
