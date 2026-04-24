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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards';
import { CreateItemEstoqueDto, UpdateItemEstoqueDto } from '../../application/dto';
import { ItemEstoqueService } from '../../application/use-case/item-estoque.service';

@ApiTags('Itens de Estoque')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('itens-estoque')
export class ItemEstoqueController {
  constructor(private readonly itemEstoqueService: ItemEstoqueService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo item de estoque' })
  @ApiResponse({ status: 201, description: 'Item de estoque criado com sucesso' })
  async create(@Body() dto: CreateItemEstoqueDto) {
    return this.itemEstoqueService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'tipo', enum: ['PECA', 'INSUMO'], required: false })
  @ApiOperation({ summary: 'Listar itens de estoque' })
  @ApiResponse({ status: 200, description: 'Lista de itens de estoque retornada com sucesso' })
  async findAll(@Query('tipo') tipo?: 'PECA' | 'INSUMO') {
    return this.itemEstoqueService.findAll(tipo);
  }

  @Get('baixo-estoque')
  @ApiOperation({ summary: 'Listar itens com estoque abaixo do mínimo' })
  @ApiResponse({ status: 200, description: 'Lista de itens com baixo estoque' })
  async findBaixoEstoque() {
    return this.itemEstoqueService.findBaixoEstoque();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar item de estoque por ID' })
  @ApiResponse({ status: 200, description: 'Item de estoque encontrado' })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  async findById(@Param('id') id: string) {
    return this.itemEstoqueService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  @ApiResponse({ status: 200, description: 'Item de estoque atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateItemEstoqueDto) {
    return this.itemEstoqueService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar item de estoque' })
  @ApiResponse({ status: 204, description: 'Item de estoque deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Item de estoque não encontrado' })
  async delete(@Param('id') id: string) {
    await this.itemEstoqueService.delete(id);
  }
}
