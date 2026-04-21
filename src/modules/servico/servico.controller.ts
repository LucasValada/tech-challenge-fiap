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
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CreateServicoDto, UpdateServicoDto } from './dto';
import { ServicoService } from './servico.service';

@ApiTags('Servicos')
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicoController {
  constructor(private readonly servicoService: ServicoService) {}

  @Post()
  async create(@Body() dto: CreateServicoDto) {
    return this.servicoService.create(dto);
  }

  @Get()
  async findAll() {
    return this.servicoService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.servicoService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateServicoDto) {
    return this.servicoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.servicoService.delete(id);
  }
}
