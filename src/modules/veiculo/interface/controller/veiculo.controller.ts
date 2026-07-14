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
import { CreateVeiculoDto, UpdateVeiculoDto } from '../../application/dto';
import { CreateVeiculoUseCase } from '../../application/use-case/create-veiculo.use-case';
import { GetAllVeiculosUseCase } from '../../application/use-case/get-all-veiculos.use-case';
import { GetVeiculoByIdUseCase } from '../../application/use-case/get-veiculo-by-id.use-case';
import { UpdateVeiculoUseCase } from '../../application/use-case/update-veiculo.use-case';
import { DeleteVeiculoUseCase } from '../../application/use-case/delete-veiculo.use-case';

@ApiTags('Veículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('veiculos')
export class VeiculoController {
  constructor(
    private readonly createVeiculoUseCase: CreateVeiculoUseCase,
    private readonly getAllVeiculosUseCase: GetAllVeiculosUseCase,
    private readonly getVeiculoByIdUseCase: GetVeiculoByIdUseCase,
    private readonly updateVeiculoUseCase: UpdateVeiculoUseCase,
    private readonly deleteVeiculoUseCase: DeleteVeiculoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo veículo' })
  @ApiResponse({ status: 201, description: 'Veículo criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Placa já cadastrada' })
  create(@Body() dto: CreateVeiculoDto) {
    return this.createVeiculoUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os veículos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de veículos retornada com sucesso',
  })
  findAll() {
    return this.getAllVeiculosUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar veículo por ID' })
  @ApiResponse({ status: 200, description: 'Veículo encontrado' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getVeiculoByIdUseCase.execute(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar veículo' })
  @ApiResponse({ status: 200, description: 'Veículo atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @ApiResponse({ status: 409, description: 'Placa já cadastrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVeiculoDto,
  ) {
    return this.updateVeiculoUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar veículo' })
  @ApiResponse({ status: 204, description: 'Veículo deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteVeiculoUseCase.execute(id);
  }
}
