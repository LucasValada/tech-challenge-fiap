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
import { JwtAuthGuard } from '../../common/guards';
import { ClientDto } from './application/dto/client.dto';
import { clientServices } from './application/use-case/cliente.use-case';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cliente')
export class ClienteController {
  constructor(private readonly clientServices: clientServices) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes retornada com sucesso',
  })
  async getAllClient() {
    const response = await this.clientServices.getAllClient();

    return response;
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async getOneClient(@Param('id') id: string) {
    const response = await this.clientServices.getOneClient(id);

    return response;
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
  async postHello(@Body() dto: ClientDto) {
    return this.clientServices.createClient(dto);
  }

  @Put('/update/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async updateClient(@Param('id') id: string, @Body() dto: ClientDto) {
    return this.clientServices.updateClient(id, dto);
  }

  @Delete('/delete/:id')
  @ApiOperation({ summary: 'Deletar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async deleteClient(@Param('id') id: string) {
    return this.clientServices.deleteClient(id);
  }
}
