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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CreateVeiculoDto, UpdateVeiculoDto } from './dto';
import { VeiculoService } from './veiculo.service';

@ApiTags('Veiculos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('veiculos')
export class VeiculoController {
  constructor(private readonly veiculoService: VeiculoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo veículo' })
  @ApiResponse({ status: 201, description: 'Veículo criado com sucesso' })
  async create(@Body() dto: CreateVeiculoDto) {
    return this.veiculoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os veículos' })
  @ApiResponse({ status: 200, description: 'Lista de veículos retornada com sucesso' })
  async findAll() {
    return this.veiculoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar veículo por ID' })
  @ApiResponse({ status: 200, description: 'Veículo encontrado' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async findById(@Param('id') id: string) {
    return this.veiculoService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar veículo' })
  @ApiResponse({ status: 200, description: 'Veículo atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateVeiculoDto) {
    return this.veiculoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar veículo' })
  @ApiResponse({ status: 204, description: 'Veículo deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async delete(@Param('id') id: string) {
    await this.veiculoService.delete(id);
  }
}
