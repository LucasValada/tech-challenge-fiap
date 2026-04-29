import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { PLACA_REGEX } from './ordem-servico.constants';

export class AprovarOrcamentoDto {
  @ApiProperty({
    description: 'Placa do veículo vinculado à OS',
    example: 'ABC1D23',
  })
  @IsString()
  @Matches(PLACA_REGEX, {
    message: 'placa deve estar em formato Mercosul ou tradicional',
  })
  placa!: string;
}
