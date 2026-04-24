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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  async findAll() {
    return this.ordemServicoService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordemServicoService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateOrdemServicoDto,
  ) {
    return this.ordemServicoService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrdemServicoDto,
  ) {
    return this.ordemServicoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.ordemServicoService.delete(id);
  }
}
