import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UsuarioCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome completo do usuário administrador',
    example: 'John Doe',
    required: true,
  })
  nome!: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email único do usuário (usado como login)',
    example: 'example@gmail.com',
    format: 'email',
    required: true,
  })
  email!: string;
}

export class UserUpdateDto {
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    description: 'Novo email do usuário (opcional; deve ser único)',
    example: 'example@gmail.com',
    format: 'email',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: 'Novo nome do usuário (opcional)',
    example: 'John Doe',
  })
  nome?: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Identificador único do usuário',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'John Doe',
  })
  nome!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@oficina.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'Data de criação do usuário',
    example: '2026-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data da última atualização do usuário',
    example: '2026-02-20T14:45:00.000Z',
    format: 'date-time',
  })
  updatedAt!: Date;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'Usuários cadastrados no sistema',
    type: [UserResponseDto],
  })
  user!: UserResponseDto[];

  @ApiProperty({
    description: 'Quantidade total de usuários retornados',
    example: 3,
  })
  count!: number;
}

export class UserCreatedResponseDto {
  @ApiProperty({
    description: 'Dados do usuário recém-criado',
    type: UserResponseDto,
  })
  user!: UserResponseDto;

  @ApiProperty({
    description:
      'Senha gerada automaticamente em texto puro (mostrada apenas nesta resposta; o hash bcrypt é o que fica persistido)',
    example: 'aB3xY9zK',
  })
  senhaGerada!: string;
}
