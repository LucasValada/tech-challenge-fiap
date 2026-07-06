import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  WebhookTokenGuard,
  WEBHOOK_TOKEN_HEADER,
} from '../../../../common/guards';
import {
  WebhookOrcamentoDto,
  WebhookOrcamentoResponseDto,
} from '../../application/dto/webhook-orcamento.dto';
import { ProcessarWebhookOrcamentoUseCase } from '../../application/use-case/processar-webhook-orcamento.use-case';

@ApiTags('Webhooks')
@Controller('webhooks/orcamento')
@UseGuards(WebhookTokenGuard)
@ApiHeader({
  name: WEBHOOK_TOKEN_HEADER,
  description: 'Token compartilhado para autenticar o sistema externo',
  required: true,
})
export class WebhookOrcamentoController {
  constructor(
    private readonly processarWebhookOrcamentoUseCase: ProcessarWebhookOrcamentoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receber decisão externa de aprovação ou recusa do orçamento',
    description:
      'Aprovação transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO. ' +
      'Recusa faz rollback AGUARDANDO_APROVACAO → EM_DIAGNOSTICO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Decisão processada',
    type: WebhookOrcamentoResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token de webhook ausente ou inválido',
  })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'OS não está em AGUARDANDO_APROVACAO',
  })
  async receber(
    @Body() dto: WebhookOrcamentoDto,
  ): Promise<WebhookOrcamentoResponseDto> {
    return this.processarWebhookOrcamentoUseCase.execute(dto);
  }
}
