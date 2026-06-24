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
import { ClientDto } from '../application/dto/client.dto';
import { CreateClienteUseCase } from '../application/use-case/createCliente.use-case';
import { DeleteClientUseCase } from '../application/use-case/deleteCliente.use-case';
import { GetAllClientUseCase } from '../application/use-case/getAllCliente.use-case';
import { GetOneClienteUseCase } from '../application/use-case/getOnecliente.use-case';
import { UpdateClienteUseCase } from '../application/use-case/updateCliente.use-case';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cliente')
export class ClienteController {
  constructor(
    private readonly createClienteUseCase: CreateClienteUseCase,
    private readonly deleteClientUseCase: DeleteClientUseCase,
    private readonly getAllClientUseCase: GetAllClientUseCase,
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
  async getAllClient() {
    const response = await this.getAllClientUseCase.execute();

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
  async createClient(@Body() dto: ClientDto) {
    return this.createClienteUseCase.execute(dto);
  }

  @Put('/update/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async updateClient(@Param('id') id: string, @Body() dto: ClientDto) {
    return this.updateClienteUseCase.execute(id, dto);
  }

  @Delete('/delete/:id')
  @ApiOperation({ summary: 'Deletar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async deleteClient(@Param('id') id: string) {
    return this.deleteClientUseCase.execute(id);
  }
}
