import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AtualizarQuantidadeOSDto {
  @ApiProperty({
    description: 'Nova quantidade da linha',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantidade!: number;
}
