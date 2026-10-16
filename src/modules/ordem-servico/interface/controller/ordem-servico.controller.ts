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
import { Roles } from '../../../../common/decorators';
import { AuthenticatedUser } from '../../../auth/domain/types';
import {
  CancelarOrdemServicoDto,
  CreateOrdemServicoDto,
  UpdateOrdemServicoDto,
} from '../../application/dto/ordem-servico.dto';
import { AdicionarServicoOSDto } from '../../application/dto/adicionar-servico-os.dto';
import { AdicionarItemEstoqueOSDto } from '../../application/dto/adicionar-item-estoque-os.dto';
import { AtualizarQuantidadeOSDto } from '../../application/dto/atualizar-quantidade-os.dto';
import { TransicionarStatusDto } from '../../application/dto/transicionar-status.dto';
import { GetAllOrdensServicoUseCase } from '../../application/use-case/get-all-ordens-servico.use-case';
import { GetMinhasOrdensServicoUseCase } from '../../application/use-case/get-minhas-ordens-servico.use-case';
import { GetMinhaOrdemServicoUseCase } from '../../application/use-case/get-minha-ordem-servico.use-case';
import { GetOrdemServicoByIdUseCase } from '../../application/use-case/get-ordem-servico-by-id.use-case';
import { CreateOrdemServicoUseCase } from '../../application/use-case/create-ordem-servico.use-case';
import { UpdateOrdemServicoUseCase } from '../../application/use-case/update-ordem-servico.use-case';
import { DeleteOrdemServicoUseCase } from '../../application/use-case/delete-ordem-servico.use-case';
import { AdicionarServicoOSUseCase } from '../../application/use-case/adicionar-servico-os.use-case';
import { AtualizarQuantidadeServicoUseCase } from '../../application/use-case/atualizar-quantidade-servico.use-case';
import { RemoverServicoOSUseCase } from '../../application/use-case/remover-servico-os.use-case';
import { AdicionarItemEstoqueOSUseCase } from '../../application/use-case/adicionar-item-estoque-os.use-case';
import { AtualizarQuantidadeItemEstoqueUseCase } from '../../application/use-case/atualizar-quantidade-item-estoque.use-case';
import { RemoverItemEstoqueOSUseCase } from '../../application/use-case/remover-item-estoque-os.use-case';
import { CancelarOrdemServicoUseCase } from '../../application/use-case/cancelar-ordem-servico.use-case';
import { TransicionarStatusUseCase } from '../../application/use-case/transicionar-status.use-case';

@ApiTags('Ordens de Serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordens-servico')
export class OrdemServicoController {
  constructor(
    private readonly getAllOrdensServicoUseCase: GetAllOrdensServicoUseCase,
    private readonly getMinhasOrdensServicoUseCase: GetMinhasOrdensServicoUseCase,
    private readonly getMinhaOrdemServicoUseCase: GetMinhaOrdemServicoUseCase,
    private readonly getOrdemServicoByIdUseCase: GetOrdemServicoByIdUseCase,
    private readonly createOrdemServicoUseCase: CreateOrdemServicoUseCase,
    private readonly updateOrdemServicoUseCase: UpdateOrdemServicoUseCase,
    private readonly deleteOrdemServicoUseCase: DeleteOrdemServicoUseCase,
    private readonly adicionarServicoOSUseCase: AdicionarServicoOSUseCase,
    private readonly atualizarQuantidadeServicoUseCase: AtualizarQuantidadeServicoUseCase,
    private readonly removerServicoOSUseCase: RemoverServicoOSUseCase,
    private readonly adicionarItemEstoqueOSUseCase: AdicionarItemEstoqueOSUseCase,
    private readonly atualizarQuantidadeItemEstoqueUseCase: AtualizarQuantidadeItemEstoqueUseCase,
    private readonly removerItemEstoqueOSUseCase: RemoverItemEstoqueOSUseCase,
    private readonly cancelarOrdemServicoUseCase: CancelarOrdemServicoUseCase,
    private readonly transicionarStatusUseCase: TransicionarStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar ordens de serviço ativas',
    description:
      'Retorna apenas OS em andamento (exclui FINALIZADA, ENTREGUE e CANCELADA). ' +
      'Ordenadas por prioridade de status ' +
      '(EM_EXECUCAO > AGUARDANDO_PAGAMENTO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA) ' +
      'e, dentro do mesmo status, mais antigas primeiro (createdAt ASC).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de OS ativas retornada com sucesso',
  })
  async findAll() {
    return this.getAllOrdensServicoUseCase.execute();
  }

  @Get('minhas')
  @Roles('cliente')
  @ApiOperation({
    summary:
      'Listar as ordens de serviço do cliente autenticado (auth por CPF)',
    description:
      'Rota protegida por autenticação via CPF. Retorna todas as OS do cliente ' +
      'dono do token (emitido pela Lambda), das mais recentes às mais antigas. ' +
      'Exige token de cliente — tokens administrativos recebem 403.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ordens de serviço do cliente autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Token não autorizado para este recurso',
  })
  async findMinhas(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.getMinhasOrdensServicoUseCase.execute(req.user.id);
  }

  @Get('minhas/:id')
  @Roles('cliente')
  @ApiOperation({
    summary:
      'Detalhar uma OS do cliente autenticado (auth por CPF), com linhas, ' +
      'totais e histórico de status',
    description:
      'Rota protegida por autenticação via CPF. Retorna o detalhe apenas se a ' +
      'OS pertencer ao cliente dono do token; tokens administrativos recebem 403.',
  })
  @ApiResponse({
    status: 200,
    description: 'OS detalhada do cliente autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Token não autorizado para este recurso',
  })
  @ApiResponse({
    status: 404,
    description: 'OS não encontrada ou não pertence ao cliente',
  })
  async findMinhaById(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getMinhaOrdemServicoUseCase.execute(req.user.id, id);
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
    return this.getOrdemServicoByIdUseCase.execute(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Criar nova OS por CPF/CNPJ + placa, opcionalmente com serviços e peças',
    description:
      'Abre a OS em RECEBIDA e inicia a Saga: o diagnóstico entra na fila do ' +
      'mecânico (Execution). O header x-correlation-id, se enviado, vira o ' +
      'correlationId da OS em todas as mensagens e logs.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ordem de serviço criada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente ou veículo não encontrado',
  })
  @ApiResponse({
    status: 422,
    description:
      'Veículo não pertence ao cliente, item indisponível ou estoque insuficiente',
  })
  async create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateOrdemServicoDto,
  ) {
    return this.createOrdemServicoUseCase.execute(
      req.user.id,
      dto,
      correlationIdDaRequisicao(req),
    );
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
    return this.updateOrdemServicoUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar ordem de serviço (só CANCELADA)',
    description:
      'Excluir uma OS no meio da Saga deixaria orçamento, pagamento e tarefas órfãos nos outros serviços.',
  })
  @ApiResponse({
    status: 204,
    description: 'Ordem de serviço deletada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  @ApiResponse({ status: 409, description: 'A OS não está CANCELADA' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteOrdemServicoUseCase.execute(id);
  }

  @Post(':id/servicos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar serviço à OS' })
  @ApiResponse({ status: 201, description: 'Linha de serviço criada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  @ApiResponse({ status: 422, description: 'Serviço inativo ou inexistente' })
  async adicionarServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarServicoOSDto,
  ) {
    return this.adicionarServicoOSUseCase.execute(id, dto);
  }

  @Put(':id/servicos/:linhaId')
  @ApiOperation({ summary: 'Atualizar quantidade de uma linha de serviço' })
  @ApiResponse({ status: 200, description: 'Linha atualizada' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  async atualizarQuantidadeServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
    @Body() dto: AtualizarQuantidadeOSDto,
  ) {
    return this.atualizarQuantidadeServicoUseCase.execute(
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
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  async removerServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
  ) {
    await this.removerServicoOSUseCase.execute(id, linhaId);
  }

  @Post(':id/itens-estoque')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar item de estoque à OS (com baixa de estoque atômica)',
  })
  @ApiResponse({ status: 201, description: 'Linha de item criada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  @ApiResponse({
    status: 422,
    description: 'Item inativo ou estoque insuficiente',
  })
  async adicionarItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarItemEstoqueOSDto,
  ) {
    return this.adicionarItemEstoqueOSUseCase.execute(id, dto);
  }

  @Put(':id/itens-estoque/:linhaId')
  @ApiOperation({
    summary:
      'Atualizar quantidade de uma linha de item (ajusta estoque por delta)',
  })
  @ApiResponse({ status: 200, description: 'Linha atualizada' })
  @ApiResponse({ status: 404, description: 'OS ou linha não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  @ApiResponse({
    status: 422,
    description: 'Estoque insuficiente para o delta',
  })
  async atualizarQuantidadeItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
    @Body() dto: AtualizarQuantidadeOSDto,
  ) {
    return this.atualizarQuantidadeItemEstoqueUseCase.execute(
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
  @ApiResponse({
    status: 409,
    description:
      'Linhas travadas: só até a conclusão do diagnóstico (RECEBIDA ou EM_DIAGNOSTICO)',
  })
  async removerItemEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linhaId', ParseUUIDPipe) linhaId: string,
  ) {
    await this.removerItemEstoqueOSUseCase.execute(id, linhaId);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar OS que espera o cliente (aprovação ou pagamento)',
    description:
      'Compensação da Saga: devolve o estoque e manda o Billing cancelar o ' +
      'orçamento, que expira o link de pagamento e estorna se o cliente tiver ' +
      'pago no meio. Nos status em que o mecânico atua, a OS é cancelada pela ' +
      'rota falhar do Execution.',
  })
  @ApiResponse({ status: 200, description: 'OS cancelada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'A OS não está em AGUARDANDO_APROVACAO nem AGUARDANDO_PAGAMENTO',
  })
  async cancelar(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarOrdemServicoDto,
  ) {
    return this.cancelarOrdemServicoUseCase.execute(
      id,
      req.user.id,
      dto.motivo,
    );
  }

  @Post(':id/transicao-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar a entrega do veículo (FINALIZADA → ENTREGUE)',
    description:
      'As demais transições vêm da Saga, a partir das respostas do Billing e do ' +
      'Execution. A entrega dispara, em best-effort, e-mail ao cliente quando ele ' +
      'tem e-mail cadastrado (falha no envio não bloqueia a transição).',
  })
  @ApiResponse({ status: 200, description: 'OS entregue' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Transição que não é a entrega, ou a OS não está FINALIZADA',
  })
  async transicionarStatus(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransicionarStatusDto,
  ) {
    return this.transicionarStatusUseCase.execute(id, req.user.id, dto);
  }
}

/**
 * Id da requisição atribuído pelo pino-http (o header `x-correlation-id`, ou um
 * UUID novo). É o correlationId que a OS leva por toda a Saga. O pino-http
 * declara `req.id` como string, número ou objeto; aqui ele é sempre a string do
 * `genReqId` (app.module.ts), e qualquer outra coisa deixa a OS gerar o seu.
 */
function correlationIdDaRequisicao(req: Request): string | undefined {
  return typeof req.id === 'string' && req.id !== '' ? req.id : undefined;
}
