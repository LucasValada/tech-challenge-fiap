import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsCpfCnpj } from '../../../../common/validators';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do cliente',
    example: 'João Silva',
  })
  nome!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Telefone do cliente',
    example: '11999999999',
    required: false,
  })
  telefone?: string | null;

  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'Email do cliente',
    example: 'joao@example.com',
    required: false,
  })
  email?: string | null;

  @IsString()
  @IsNotEmpty()
  @IsCpfCnpj()
  @ApiProperty({
    description: 'CPF ou CNPJ do cliente (com ou sem pontuação)',
    example: '529.982.247-25',
  })
  cpfCnpj!: string;

  @IsString()
  @IsIn(['FISICA', 'JURIDICA'])
  @ApiProperty({
    description: 'Tipo do cliente',
    example: 'FISICA',
    enum: ['FISICA', 'JURIDICA'],
  })
  tipoPessoa!: 'FISICA' | 'JURIDICA';
}
