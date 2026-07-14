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
  @ApiProperty({
    description: 'Nome do serviço oferecido pela oficina',
    example: 'Troca de óleo',
  })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({
    description: 'Descrição detalhada do serviço (opcional)',
    example: 'Troca de óleo e filtro para motores 1.0 a 2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({
    description:
      'Preço base do serviço em BRL (até 2 casas decimais); é o preço snapshotado quando o serviço entra numa OS',
    example: 150,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoBase!: number;

  @ApiProperty({
    description:
      'Tempo estimado de execução do serviço em minutos (usado no relatório de tempo médio)',
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  tempoEstimadoMin!: number;
}
