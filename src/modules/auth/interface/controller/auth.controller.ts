import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../../application/use-case/auth.service';
import { LoginDto } from '../../application/dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticação de usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso, retorna accessToken JWT' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha);
  }
}
