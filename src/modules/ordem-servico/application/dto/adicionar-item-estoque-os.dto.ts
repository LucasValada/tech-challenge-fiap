import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AdicionarItemEstoqueOSDto {
  @ApiProperty({
    description: 'Identificador (UUID) do item de estoque cadastrado',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsUUID()
  itemEstoqueId!: string;

  @ApiProperty({ description: 'Quantidade do item', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}
