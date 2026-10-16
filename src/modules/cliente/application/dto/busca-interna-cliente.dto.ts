import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BuscaInternaClienteDto {
  @ApiProperty({
    description: 'CPF do cliente, com ou sem pontuação',
    example: '529.982.247-25',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, {
    message: 'cpf deve ter 11 dígitos, com ou sem pontuação',
  })
  cpf!: string;
}

export class ClienteParaAutenticacaoDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Maria Silva' }) nome!: string;
  @ApiProperty({ enum: ['ATIVO', 'INATIVO'] }) status!: 'ATIVO' | 'INATIVO';
}
