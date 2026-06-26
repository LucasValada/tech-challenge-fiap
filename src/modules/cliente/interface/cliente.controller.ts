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
import { JwtAuthGuard } from '../../../common/guards';
import { ClienteDto } from '../application/dto/cliente.dto';
import { CreateClienteUseCase } from '../application/use-case/createCliente.use-case';
import { DeleteClienteUseCase } from '../application/use-case/deleteCliente.use-case';
import { GetAllClienteUseCase } from '../application/use-case/getAllCliente.use-case';
import { GetOneClienteUseCase } from '../application/use-case/getOneCliente.use-case';
import { UpdateClienteUseCase } from '../application/use-case/updateCliente.use-case';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cliente')
export class ClienteController {
  constructor(
    private readonly createClienteUseCase: CreateClienteUseCase,
    private readonly deleteClienteUseCase: DeleteClienteUseCase,
    private readonly getAllClienteUseCase: GetAllClienteUseCase,
    private readonly getOneClienteUseCase: GetOneClienteUseCase,
    private readonly updateClienteUseCase: UpdateClienteUseCase,
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes retornada com sucesso',
  })
  async getAllCliente() {
    const response = await this.getAllClienteUseCase.execute();

    return response;
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async getOneClient(@Param('id') id: string) {
    const response = await this.getOneClienteUseCase.execute(id);

    return response;
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
  async createCliente(@Body() dto: ClienteDto) {
    return this.createClienteUseCase.execute(dto);
  }

  @Put('/update/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async updateCliente(@Param('id') id: string, @Body() dto: ClienteDto) {
    return this.updateClienteUseCase.execute(id, dto);
  }

  @Delete('/delete/:id')
  @ApiOperation({ summary: 'Deletar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async deleteCliente(@Param('id') id: string) {
    return this.deleteClienteUseCase.execute(id);
  }
}
