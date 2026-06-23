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
import { CreateServicoDto, UpdateServicoDto } from '../../application/dto';
import { UpdateServicoUseCase } from '../../application/use-case/updateServico.use-case';
import { FindByIdServicoUseCase } from '../../application/use-case/findByIdServico.use-case';
import { FindAllServicoUseCase } from '../../application/use-case/findAllServico.use-case';
import { DeleteServicoUseCase } from '../../application/use-case/deleteServico.use-case';
import { CreateServicoUseCase } from '../../application/use-case/createServico.use-case';

@ApiTags('Servicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicoController {
  constructor(
    private readonly createServicoUseCase: CreateServicoUseCase,
    private readonly deleteServicoUseCase: DeleteServicoUseCase,
    private readonly findAllServicoUseCase: FindAllServicoUseCase,
    private readonly findByIdServicoUseCase: FindByIdServicoUseCase,
    private readonly updateServicoUseCase: UpdateServicoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  async create(@Body() dto: CreateServicoDto) {
    return this.createServicoUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços' })
  @ApiResponse({
    status: 200,
    description: 'Lista de serviços retornada com sucesso',
  })
  async findAll() {
    return this.findAllServicoUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar serviço por ID' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async findById(@Param('id') id: string) {
    return this.findByIdServicoUseCase.execute(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateServicoDto) {
    return this.updateServicoUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar serviço' })
  @ApiResponse({ status: 204, description: 'Serviço deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async delete(@Param('id') id: string) {
    await this.deleteServicoUseCase.execute(id);
  }
}
