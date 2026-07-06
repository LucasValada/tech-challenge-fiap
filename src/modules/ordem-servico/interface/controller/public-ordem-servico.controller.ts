import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicOrdemServicoResponseDto } from '../../application/dto/public-ordem-servico.dto';
import { AprovarOrcamentoDto } from '../../application/dto/aprovar-orcamento.dto';
import { ConsultarOrdemServicoPublicaUseCase } from '../../application/use-case/consultar-ordem-servico-publica.use-case';
import { AprovarOrcamentoPublicoUseCase } from '../../application/use-case/aprovar-orcamento-publico.use-case';

@ApiTags('Acompanhamento Público de OS')
@Controller('public/ordens-servico')
export class PublicOrdemServicoController {
  constructor(
    private readonly consultarOrdemServicoPublicaUseCase: ConsultarOrdemServicoPublicaUseCase,
    private readonly aprovarOrcamentoPublicoUseCase: AprovarOrcamentoPublicoUseCase,
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
    return this.consultarOrdemServicoPublicaUseCase.execute(codigo, placa);
  }

  @Post(':codigo/aprovar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cliente aprova o orçamento da OS (transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO)',
  })
  @ApiResponse({
    status: 200,
    description: 'Orçamento aprovado, OS atualizada retornada',
    type: PublicOrdemServicoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'OS não está em AGUARDANDO_APROVACAO',
  })
  async aprovarOrcamento(
    @Param('codigo') codigo: string,
    @Body() dto: AprovarOrcamentoDto,
  ): Promise<PublicOrdemServicoResponseDto> {
    return this.aprovarOrcamentoPublicoUseCase.execute(codigo, dto.placa);
  }
}
