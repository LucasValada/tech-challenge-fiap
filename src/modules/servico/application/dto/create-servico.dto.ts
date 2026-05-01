import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServicoDto {
  @ApiProperty({ example: 'Troca de óleo' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({
    example: 'Troca de óleo e filtro para motores 1.0 a 2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoBase!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  tempoEstimadoMin!: number;
}
