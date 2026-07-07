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
import { CreateServicoDto, UpdateServicoDto } from '../../application/dto';
import { CreateServicoUseCase } from '../../application/use-case/create-servico.use-case';
import { GetAllServicosUseCase } from '../../application/use-case/get-all-servicos.use-case';
import { GetServicoByIdUseCase } from '../../application/use-case/get-servico-by-id.use-case';
import { UpdateServicoUseCase } from '../../application/use-case/update-servico.use-case';
import { DeleteServicoUseCase } from '../../application/use-case/delete-servico.use-case';

@ApiTags('Servicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicoController {
  constructor(
    private readonly createServicoUseCase: CreateServicoUseCase,
    private readonly getAllServicosUseCase: GetAllServicosUseCase,
    private readonly getServicoByIdUseCase: GetServicoByIdUseCase,
    private readonly updateServicoUseCase: UpdateServicoUseCase,
    private readonly deleteServicoUseCase: DeleteServicoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  create(@Body() dto: CreateServicoDto) {
    return this.createServicoUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços' })
  @ApiResponse({
    status: 200,
    description: 'Lista de serviços retornada com sucesso',
  })
  findAll() {
    return this.getAllServicosUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar serviço por ID' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getServicoByIdUseCase.execute(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServicoDto,
  ) {
    return this.updateServicoUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar serviço' })
  @ApiResponse({ status: 204, description: 'Serviço deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteServicoUseCase.execute(id);
  }
}
