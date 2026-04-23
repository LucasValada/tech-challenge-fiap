import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

const STATUS_VALUES: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
];

export class CreateOrdemServicoDto {
  @ApiProperty({
    description: 'ID do cliente',
    example: '3f2b8b7e-6f4e-4e2b-9a41-ddc5d8a1b2c3',
  })
  @IsUUID()
  @IsNotEmpty()
  clienteId!: string;

  @ApiProperty({
    description: 'ID do veículo',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  veiculoId!: string;

  @ApiPropertyOptional({
    description: 'Observações iniciais da OS',
    example: 'Veículo chegou com barulho na suspensão',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class UpdateOrdemServicoDto {
  @ApiPropertyOptional({
    description: 'Observações da OS',
    example: 'Cliente autorizou troca de pastilhas',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Status da OS',
    enum: STATUS_VALUES,
    example: 'EM_DIAGNOSTICO',
  })
  @IsEnum(STATUS_VALUES)
  @IsOptional()
  status?: StatusOrdemServico;
}
