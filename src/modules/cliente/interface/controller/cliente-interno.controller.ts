import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  INTERNAL_TOKEN_HEADER,
  InternalTokenGuard,
} from '../../../../common/guards';
import {
  BuscaInternaClienteDto,
  ClienteParaAutenticacaoDto,
} from '../../application/dto/busca-interna-cliente.dto';
import {
  BuscarClientePorCpfUseCase,
  ClienteParaAutenticacao,
} from '../../application/use-case/buscar-cliente-por-cpf.use-case';

/**
 * Rota interna para a Lambda de autenticação por CPF. É `POST`, e não `GET`,
 * para o CPF ir no corpo e não na URL — a URL vai para os logs.
 */
@ApiTags('Interno')
@ApiHeader({
  name: INTERNAL_TOKEN_HEADER,
  description: 'Token compartilhado com a Lambda de autenticação (SSM)',
  required: true,
})
@UseGuards(InternalTokenGuard)
@Controller('internal/clientes')
export class ClienteInternoController {
  constructor(private readonly buscarPorCpf: BuscarClientePorCpfUseCase) {}

  @Post('busca')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar cliente por CPF (Lambda de autenticação)',
    description:
      'Devolve id, nome e status do cliente para a Lambda emitir o token. A Lambda recusa cliente INATIVO.',
  })
  @ApiOkResponse({ type: ClienteParaAutenticacaoDto })
  @ApiResponse({
    status: 401,
    description: 'Token interno ausente ou inválido',
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  buscar(
    @Body() dto: BuscaInternaClienteDto,
  ): Promise<ClienteParaAutenticacao> {
    return this.buscarPorCpf.execute(dto.cpf);
  }
}
