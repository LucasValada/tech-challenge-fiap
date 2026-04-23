import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UsuarioDto {
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
  email!: string;
}

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
  email!: string;
}

export class UserUpdateDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;
}
