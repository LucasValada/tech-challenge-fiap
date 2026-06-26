import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsCpfCnpj } from '../../../../common/validators';

export class ClienteDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'John Doe',
    required: true,
  })
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11)937379050',
    required: true,
  })
  telefone!: string | null;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@email.com',
    required: true,
  })
  email!: string | null;

  @IsString()
  @IsNotEmpty()
  @IsCpfCnpj()
  @ApiProperty({
    description: 'CPF ou CNPJ do cliente (com ou sem pontuação)',
    example: '529.982.247-25',
    required: true,
  })
  cpfCnpj!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tipo do cliente',
    example: 'FISICA',
    required: true,
  })
  tipoPessoa!: 'FISICA' | 'JURIDICA';
}
