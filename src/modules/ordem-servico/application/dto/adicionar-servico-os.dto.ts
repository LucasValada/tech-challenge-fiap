import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AdicionarServicoOSDto {
  @ApiProperty({
    description: 'Identificador (UUID) do serviço cadastrado',
    example: '3f2b8b7e-6f4e-4e2b-9a41-ddc5d8a1b2c3',
    format: 'uuid',
  })
  @IsUUID()
  servicoId!: string;

  @ApiProperty({ description: 'Quantidade do serviço', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}
