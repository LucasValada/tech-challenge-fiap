import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';
import { STATUS_VALUES } from './ordem-servico.constants';

export class TransicionarStatusDto {
  @ApiProperty({
    description: 'Novo status da OS',
    enum: STATUS_VALUES,
    example: 'EM_DIAGNOSTICO',
  })
  @IsEnum(STATUS_VALUES)
  status!: StatusOrdemServico;

  @ApiPropertyOptional({
    description: 'Observação opcional sobre a transição',
    example: 'Cliente aprovou orçamento via WhatsApp',
  })
  @IsOptional()
  @IsString()
  observacao?: string;
}
