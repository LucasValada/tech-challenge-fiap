import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrdemServicoRepository,
  PublicOrdemServicoView,
} from '../../domain/repository/ordem-servico.repository';
import { OSStatusInvalidoParaAprovacaoError } from '../../domain/errors';

@Injectable()
export class AprovarOrcamentoPublicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView> {
    const codigoNormalizado = codigo.trim().toUpperCase();
    const placaNormalizada = placa.trim().toUpperCase();

    const ordem = await this.ordemServicoRepository.findByCodigoEPlaca(
      codigoNormalizado,
      placaNormalizada,
    );

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (ordem.status !== 'AGUARDANDO_APROVACAO') {
      throw new ConflictException(
        new OSStatusInvalidoParaAprovacaoError(ordem.status).message,
      );
    }

    await this.ordemServicoRepository.transicionarStatus(
      ordem.id!,
      'EM_EXECUCAO',
      'AVANCO',
      ordem.usuarioCriadorId,
      'Orçamento aprovado pelo cliente',
    );

    const view = await this.ordemServicoRepository.findPublicByCodigoEPlaca(
      codigoNormalizado,
      placaNormalizada,
    );
    if (!view) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada após aprovação',
      );
    }

    return view;
  }
}
