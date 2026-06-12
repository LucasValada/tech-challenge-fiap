import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsCpfCnpj } from '../../../../common/validators';
import { PLACA_REGEX } from './ordem-servico.constants';

export class CreateOrdemServicoServicoLinhaDto {
  @ApiProperty({
    description: 'ID do serviço cadastrado',
    example: '3f2b8b7e-6f4e-4e2b-9a41-ddc5d8a1b2c3',
  })
  @IsUUID()
  servicoId!: string;

  @ApiProperty({ description: 'Quantidade do serviço', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class CreateOrdemServicoItemEstoqueLinhaDto {
  @ApiProperty({
    description: 'ID do item de estoque',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  itemEstoqueId!: string;

  @ApiProperty({ description: 'Quantidade do item', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class CreateOrdemServicoDto {
  @ApiProperty({
    description: 'CPF ou CNPJ do cliente (com ou sem pontuação)',
    example: '529.982.247-25',
  })
  @IsString()
  @IsCpfCnpj()
  cpfCnpj!: string;

  @ApiProperty({
    description: 'Placa do veículo (Mercosul ou tradicional)',
    example: 'ABC1D23',
  })
  @IsString()
  @Matches(PLACA_REGEX, {
    message: 'placa deve estar em formato Mercosul ou tradicional',
  })
  placa!: string;

  @ApiPropertyOptional({
    description: 'Observações iniciais da OS',
    example: 'Veículo chegou com barulho na suspensão',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Lista de serviços a incluir na criação',
    type: [CreateOrdemServicoServicoLinhaDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CreateOrdemServicoServicoLinhaDto)
  servicos?: CreateOrdemServicoServicoLinhaDto[];

  @ApiPropertyOptional({
    description: 'Lista de itens de estoque a incluir na criação',
    type: [CreateOrdemServicoItemEstoqueLinhaDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CreateOrdemServicoItemEstoqueLinhaDto)
  itens?: CreateOrdemServicoItemEstoqueLinhaDto[];
}

export class UpdateOrdemServicoDto {
  @ApiPropertyOptional({
    description: 'Observações da OS',
    example: 'Cliente autorizou troca de pastilhas',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
