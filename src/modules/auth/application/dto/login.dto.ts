import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@oficina.com',
    description: 'Email do usuário administrador',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'senha123',
    description: 'Senha do usuário administrador',
  })
  @IsString()
  @IsNotEmpty()
  senha!: string;
}
