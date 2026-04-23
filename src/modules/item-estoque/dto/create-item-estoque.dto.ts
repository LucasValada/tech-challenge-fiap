import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

enum TipoItemEstoque {
  PECA = 'PECA',
  INSUMO = 'INSUMO',
}

export class CreateItemEstoqueDto {
  @ApiProperty({ example: 'Filtro de óleo' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ enum: TipoItemEstoque, example: 'PECA' })
  @IsEnum(TipoItemEstoque, {
    message: 'tipo must be PECA or INSUMO',
  })
  tipo!: TipoItemEstoque;

  @ApiProperty({ example: 'FLT-OLEO-001' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({
    example: 'Filtro de óleo para motores 1.0 a 2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ example: 45.9 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoUnitario!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  quantidadeEstoque!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  estoqueMinimo!: number;
}
