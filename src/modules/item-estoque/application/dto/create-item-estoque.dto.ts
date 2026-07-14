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
  @ApiProperty({
    description: 'Nome do item (peça ou insumo)',
    example: 'Filtro de óleo',
  })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({
    description:
      'Tipo do item: PECA (peça de reposição) ou INSUMO (consumível como óleo, fluidos)',
    enum: TipoItemEstoque,
    example: 'PECA',
  })
  @IsEnum(TipoItemEstoque, {
    message: 'tipo must be PECA or INSUMO',
  })
  tipo!: TipoItemEstoque;

  @ApiProperty({
    description:
      'SKU único do item (identificador de catálogo); único no sistema',
    example: 'FLT-OLEO-001',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({
    description: 'Descrição detalhada do item (opcional)',
    example: 'Filtro de óleo para motores 1.0 a 2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({
    description: 'Preço unitário em BRL (até 2 casas decimais)',
    example: 45.9,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoUnitario!: number;

  @ApiProperty({
    description: 'Quantidade atual em estoque',
    example: 50,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantidadeEstoque!: number;

  @ApiProperty({
    description:
      'Nível mínimo de estoque; itens abaixo desse limite aparecem em GET /itens-estoque/baixo-estoque',
    example: 10,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  estoqueMinimo!: number;
}
