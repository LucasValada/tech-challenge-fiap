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
  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@gmail.com',
    required: true,
  })
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
  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@gmail.com',
    required: true,
  })
  email!: string;
}

export class UserUpdateDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@gmail.com',
    required: true,
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'John Doe',
    required: true,
  })
  nome!: string;
}
