import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUseCase } from '../../application/use-case/login.use-case';
import { LoginDto } from '../../application/dto/login.dto';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticação de usuário' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso, retorna accessToken JWT',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto.email, dto.senha);
    } catch (error) {
      if (error instanceof CredenciaisInvalidasError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
