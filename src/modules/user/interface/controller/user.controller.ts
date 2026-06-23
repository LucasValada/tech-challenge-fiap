import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards';
import { GetAllUsersUseCase } from '../../application/use-case/get-all-users.use-case';
import { GetUserByIdUseCase } from '../../application/use-case/get-user-by-id.use-case';
import { CreateUserUseCase } from '../../application/use-case/create-user.use-case';
import { UpdateUserUseCase } from '../../application/use-case/update-user.use-case';
import { DeleteUserUseCase } from '../../application/use-case/delete-user.use-case';
import {
  UserUpdateDto,
  UsuarioCreateDto,
} from '../../application/dto/user.dto';

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
  })
  getUser() {
    return this.getAllUsersUseCase.execute();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  getUserById(@Param('id') id: string) {
    return this.getUserByIdUseCase.execute(id);
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso (senha gerada automaticamente)',
  })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  createUser(@Body() dto: UsuarioCreateDto) {
    return this.createUserUseCase.execute(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  updateUser(@Param('id') id: string, @Body() dto: UserUpdateDto) {
    return this.updateUserUseCase.execute(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  deleteUser(@Param('id') id: string) {
    return this.deleteUserUseCase.execute(id);
  }
}
