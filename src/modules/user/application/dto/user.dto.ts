import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UsuarioCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'John Doe',
    required: true,
  })
  nome!: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@gmail.com',
    required: true,
  })
  email!: string;
}

export class UserUpdateDto {
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'example@gmail.com',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: 'Nome do usuário',
    example: 'John Doe',
  })
  nome?: string;
}

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário' })
  id!: string;

  @ApiProperty({ description: 'Nome do usuário' })
  nome!: string;

  @ApiProperty({ description: 'Email do usuário' })
  email!: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt!: Date;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'Usuários cadastrados',
    type: [UserResponseDto],
  })
  user!: UserResponseDto[];

  @ApiProperty({ description: 'Total de usuários' })
  count!: number;
}

export class UserCreatedResponseDto {
  @ApiProperty({
    description: 'Usuário criado',
    type: UserResponseDto,
  })
  user!: UserResponseDto;

  @ApiProperty({
    description: 'Senha gerada em texto puro (mostrada apenas nesta resposta)',
    example: 'aB3xY9zK',
  })
  senhaGerada!: string;
}
