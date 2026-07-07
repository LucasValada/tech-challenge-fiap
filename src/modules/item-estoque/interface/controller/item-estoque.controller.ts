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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards';
import {
  CreateItemEstoqueDto,
  UpdateItemEstoqueDto,
} from '../../application/dto';
import { CreateItemEstoqueUseCase } from '../../application/use-case/create-item-estoque.use-case';
import { GetAllItensEstoqueUseCase } from '../../application/use-case/get-all-itens-estoque.use-case';
import { GetItemEstoqueByIdUseCase } from '../../application/use-case/get-item-estoque-by-id.use-case';
import { GetItensBaixoEstoqueUseCase } from '../../application/use-case/get-itens-baixo-estoque.use-case';
import { UpdateItemEstoqueUseCase } from '../../application/use-case/update-item-estoque.use-case';
import { DeleteItemEstoqueUseCase } from '../../application/use-case/delete-item-estoque.use-case';

@ApiTags('Itens de Estoque')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('itens-estoque')
export class ItemEstoqueController {
  constructor(
    private readonly createItemEstoqueUseCase: CreateItemEstoqueUseCase,
    private readonly getAllItensEstoqueUseCase: GetAllItensEstoqueUseCase,
    private readonly getItemEstoqueByIdUseCase: GetItemEstoqueByIdUseCase,
    private readonly getItensBaixoEstoqueUseCase: GetItensBaixoEstoqueUseCase,
    private readonly updateItemEstoqueUseCase: UpdateItemEstoqueUseCase,
    private readonly deleteItemEstoqueUseCase: DeleteItemEstoqueUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo item de estoque' })
  @ApiResponse({
    status: 201,
    description: 'Item de estoque criado com sucesso',
  })
  create(@Body() dto: CreateItemEstoqueDto) {
    return this.createItemEstoqueUseCase.execute(dto);
  }

  @Get()
  @ApiQuery({ name: 'tipo', enum: ['PECA', 'INSUMO'], required: false })
  @ApiOperation({ summary: 'Listar itens de estoque' })
  @ApiResponse({
    status: 200,
    description: 'Lista de itens de estoque retornada com sucesso',
  })
  findAll(@Query('tipo') tipo?: 'PECA' | 'INSUMO') {
    return this.getAllItensEstoqueUseCase.execute(tipo);
  }

  @Get('baixo-estoque')
  @ApiOperation({ summary: 'Listar itens com estoque abaixo do mínimo' })
  @ApiResponse({ status: 200, description: 'Lista de itens com baixo estoque' })
  findBaixoEstoque() {
    return this.getItensBaixoEstoqueUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar item de estoque por ID' })
  @ApiResponse({ status: 200, description: 'Item de estoque encontrado' })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getItemEstoqueByIdUseCase.execute(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  @ApiResponse({
    status: 200,
    description: 'Item de estoque atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemEstoqueDto) {
    return this.updateItemEstoqueUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar item de estoque' })
  @ApiResponse({
    status: 204,
    description: 'Item de estoque deletado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteItemEstoqueUseCase.execute(id);
  }
}
