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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../common/guards';
import { AuthenticatedUser } from '../../../auth/domain/types';
import {
  CreateOrdemServicoDto,
  UpdateOrdemServicoDto,
} from '../../application/dto/ordem-servico.dto';
import { AdicionarServicoOSDto } from '../../application/dto/adicionar-servico-os.dto';
import { AdicionarItemEstoqueOSDto } from '../../application/dto/adicionar-item-estoque-os.dto';
import { AtualizarQuantidadeOSDto } from '../../application/dto/atualizar-quantidade-os.dto';
import { TransicionarStatusDto } from '../../application/dto/transicionar-status.dto';
import { OrdemServicoService } from '../../application/use-case/ordem-servico.service';

@ApiTags('Ordens de Serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordens-servico')
export class OrdemServicoController {
  constructor(private readonly ordemServicoService: OrdemServicoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as ordens de serviço' })
  @ApiResponse({
    status: 200,
    description: 'Lista de ordens de serviço retornada com sucesso',
  })
  async findAll() {
    return this.ordemServicoService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar OS por ID com linhas, totais e histórico de status',
  })
  @ApiResponse({
    status: 200,
    description: 'OS detalhada (cliente, veículo, linhas e histórico)',
  })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordemServicoService.findByIdComDetalhes(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Criar nova OS por CPF/CNPJ + placa, opcionalmente com serviços e peças',
  })
  @ApiResponse({
    status: 201,
    description: 'Ordem de serviço criada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Cliente ou veículo não encontrado' })
  @ApiResponse({
    status: 422,
    description: 'Veículo não pertence ao cliente, item indisponível ou estoque insuficiente',
  })
  async create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateOrdemServicoDto,
  ) {
    return this.ordemServicoService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar observações da OS' })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço atualizada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrdemServicoDto,
  ) {
    return this.ordemServicoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar ordem de serviço' })
  @ApiResponse({
    status: 204,
    description: 'Ordem de serviço deletada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.ordemServicoService.delete(id);
  }

  @Post(':id/servicos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar serviço à OS' })
  @ApiResponse({ status: 201, description: 'Linha de serviço criada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  @ApiResponse({ status: 422, description: 'Serviço inativo ou inexistente' })
  async adicionarServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarServicoOSDto,
  ) {
    return this.ordemServicoService.adicionarServico(id, dto);
  }

  @Put(':id/servicos/:linhaId')
  @ApiOperation({ summary: 'Atualizar quantidade de uma linha de serviço' })
  @ApiResponse({ status: 200, description: 'Linha atualizada' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  async atualizarQuantidadeServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
    @Body() dto: AtualizarQuantidadeOSDto,
  ) {
    return this.ordemServicoService.atualizarQuantidadeServico(
      id,
      linhaId,
      dto.quantidade,
    );
  }

  @Delete(':id/servicos/:linhaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover serviço da OS' })
  @ApiResponse({ status: 204, description: 'Linha removida' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  async removerServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
  ) {
    await this.ordemServicoService.removerServico(id, linhaId);
  }

  @Post(':id/itens-estoque')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar item de estoque à OS (com baixa de estoque atômica)',
  })
  @ApiResponse({ status: 201, description: 'Linha de item criada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  @ApiResponse({
    status: 422,
    description: 'Item inativo ou estoque insuficiente',
  })
  async adicionarItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarItemEstoqueOSDto,
  ) {
    return this.ordemServicoService.adicionarItemEstoque(id, dto);
  }

  @Put(':id/itens-estoque/:linhaId')
  @ApiOperation({
    summary: 'Atualizar quantidade de uma linha de item (ajusta estoque por delta)',
  })
  @ApiResponse({ status: 200, description: 'Linha atualizada' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  @ApiResponse({ status: 422, description: 'Estoque insuficiente para o delta' })
  async atualizarQuantidadeItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
    @Body() dto: AtualizarQuantidadeOSDto,
  ) {
    return this.ordemServicoService.atualizarQuantidadeItemEstoque(
      id,
      linhaId,
      dto.quantidade,
    );
  }

  @Delete(':id/itens-estoque/:linhaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover item de estoque da OS (restitui saldo no cadastro)',
  })
  @ApiResponse({ status: 204, description: 'Linha removida' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({ status: 409, description: 'OS imutável no status atual' })
  async removerItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
  ) {
    await this.ordemServicoService.removerItemEstoque(id, linhaId);
  }

  @Post(':id/enviar-orcamento')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Enviar orçamento da OS para aprovação do cliente (transiciona EM_DIAGNOSTICO → AGUARDANDO_APROVACAO)',
  })
  @ApiResponse({
    status: 200,
    description: 'Orçamento enviado, OS detalhada retornada',
  })
  @ApiResponse({
    status: 404,
    description: 'OS não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'OS não está em EM_DIAGNOSTICO',
  })
  @ApiResponse({
    status: 422,
    description: 'OS não possui serviços ou peças cadastrados',
  })
  async enviarOrcamento(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordemServicoService.enviarOrcamento(id, req.user.id);
  }

  @Post(':id/transicao-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Transicionar status da OS (avanço linear ou rollback de 1 passo)',
  })
  @ApiResponse({ status: 200, description: 'Status transicionado' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Transição inválida pela máquina de estados',
  })
  async transicionarStatus(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransicionarStatusDto,
  ) {
    return this.ordemServicoService.transicionarStatus(id, req.user.id, dto);
  }
}
