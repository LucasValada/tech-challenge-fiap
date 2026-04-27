import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class clientDto {
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
  @ApiProperty({
    description: 'Cpf ou cnpj do usuário',
    example: '123.456.789-00',
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
