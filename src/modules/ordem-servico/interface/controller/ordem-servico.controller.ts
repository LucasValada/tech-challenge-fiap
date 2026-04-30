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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../common/guards';
import { AuthenticatedUser } from '../../../auth/domain/types';
import {
  CreateOrdemServicoDto,
  UpdateOrdemServicoDto,
} from '../../application/dto/ordem-servico.dto';
import { OrdemServicoService } from '../../application/use-case/ordem-servico.service';

@ApiTags('Ordens de Serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordens-servico')
export class OrdemServicoController {
  constructor(private readonly ordemServicoService: OrdemServicoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as ordens de serviço' })
  @ApiResponse({ status: 200, description: 'Lista de ordens de serviço retornada com sucesso' })
  async findAll() {
    return this.ordemServicoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ordem de serviço por ID' })
  @ApiResponse({ status: 200, description: 'Ordem de serviço encontrada' })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordemServicoService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova ordem de serviço' })
  @ApiResponse({ status: 201, description: 'Ordem de serviço criada com sucesso' })
  async create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateOrdemServicoDto,
  ) {
    return this.ordemServicoService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar ordem de serviço' })
  @ApiResponse({ status: 200, description: 'Ordem de serviço atualizada com sucesso' })
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
  @ApiResponse({ status: 204, description: 'Ordem de serviço deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.ordemServicoService.delete(id);
  }
}
