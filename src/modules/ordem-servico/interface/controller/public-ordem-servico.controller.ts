import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicOrdemServicoResponseDto } from '../../application/dto/public-ordem-servico.dto';
import { PublicOrdemServicoService } from '../../application/use-case/public-ordem-servico.service';

@ApiTags('Acompanhamento Público de OS')
@Controller('public/ordens-servico')
export class PublicOrdemServicoController {
  constructor(
    private readonly publicOrdemServicoService: PublicOrdemServicoService,
  ) {}

  @Get(':codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar OS pelo código informando a placa do veículo',
  })
  @ApiQuery({
    name: 'placa',
    required: true,
    description: 'Placa do veículo vinculado à OS',
    example: 'ABC1D23',
  })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço encontrada',
    type: PublicOrdemServicoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Placa não informada' })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async consultar(
    @Param('codigo') codigo: string,
    @Query('placa') placa?: string,
  ): Promise<PublicOrdemServicoResponseDto> {
    if (!placa || placa.trim().length === 0) {
      throw new BadRequestException('placa é obrigatória');
    }
    return this.publicOrdemServicoService.consultar(codigo, placa);
  }
}
