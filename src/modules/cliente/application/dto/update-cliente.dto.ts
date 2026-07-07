import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { IsCpfCnpj } from '../../../../common/validators';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Nome do cliente' })
  nome?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  telefone?: string | null;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ description: 'Email do cliente' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @IsCpfCnpj()
  @ApiPropertyOptional({
    description: 'CPF ou CNPJ do cliente (com ou sem pontuação)',
  })
  cpfCnpj?: string;

  @IsOptional()
  @IsString()
  @IsIn(['FISICA', 'JURIDICA'])
  @ApiPropertyOptional({
    description: 'Tipo do cliente',
    enum: ['FISICA', 'JURIDICA'],
  })
  tipoPessoa?: 'FISICA' | 'JURIDICA';
}
