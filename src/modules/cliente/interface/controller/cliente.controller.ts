import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreateClienteDto, UpdateClienteDto } from '../../application/dto';
import { CreateClienteUseCase } from '../../application/use-case/create-cliente.use-case';
import { GetAllClientesUseCase } from '../../application/use-case/get-all-clientes.use-case';
import { GetClienteByIdUseCase } from '../../application/use-case/get-cliente-by-id.use-case';
import { UpdateClienteUseCase } from '../../application/use-case/update-cliente.use-case';
import { DeleteClienteUseCase } from '../../application/use-case/delete-cliente.use-case';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cliente')
export class ClienteController {
  constructor(
    private readonly createClienteUseCase: CreateClienteUseCase,
    private readonly getAllClientesUseCase: GetAllClientesUseCase,
    private readonly getClienteByIdUseCase: GetClienteByIdUseCase,
    private readonly updateClienteUseCase: UpdateClienteUseCase,
    private readonly deleteClienteUseCase: DeleteClienteUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
  create(@Body() dto: CreateClienteDto) {
    return this.createClienteUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes retornada com sucesso',
  })
  findAll() {
    return this.getAllClientesUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getClienteByIdUseCase.execute(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.updateClienteUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar cliente' })
  @ApiResponse({ status: 204, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteClienteUseCase.execute(id);
  }
}
