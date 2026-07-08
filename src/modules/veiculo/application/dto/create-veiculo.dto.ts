import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateVeiculoDto {
  @ApiProperty({
    example: 'ABC1D23',
    description:
      'Placa do veículo no padrão Mercosul (ABC1D23) ou legacy (ABC1234); é normalizada para uppercase e sem hífens',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replaceAll('-', '').toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}\d[A-Z0-9]\d{2}$/, {
    message:
      'placa must be a valid Brazilian license plate (e.g., ABC1D23 or ABC1234)',
  })
  placa!: string;

  @ApiProperty({
    example: 'Toyota',
    description: 'Marca do veículo',
  })
  @IsString()
  @IsNotEmpty()
  marca!: string;

  @ApiProperty({
    example: 'Corolla',
    description: 'Modelo do veículo',
  })
  @IsString()
  @IsNotEmpty()
  modelo!: string;

  @ApiProperty({
    example: 2023,
    description: 'Ano de fabricação do veículo (entre 1900 e ano atual + 1)',
  })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano!: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador (UUID) do cliente dono do veículo',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  clienteId!: string;
}
