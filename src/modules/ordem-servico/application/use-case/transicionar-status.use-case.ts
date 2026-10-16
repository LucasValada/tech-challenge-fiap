import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { classificarTransicaoManual } from '../../domain/services/maquinaDeEstadosOS';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { TransicionarStatusDto } from '../dto/transicionar-status.dto';
import { NotificadorStatusOS } from '../shared/notificador-status-os';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

/**
 * Transição manual de status. Na Fase 4 só sobra a entrega do veículo
 * (FINALIZADA → ENTREGUE); as demais transições vêm da Saga. A entrega dispara,
 * em best-effort, o e-mail ao cliente.
 */
@Injectable()
export class TransicionarStatusUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    private readonly notificador: NotificadorStatusOS,
  ) {}

  async execute(
    ordemId: string,
    usuarioId: string,
    dto: TransicionarStatusDto,
  ): Promise<OrdemServico> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    const resultado = classificarTransicaoManual(ordem.status, dto.status);
    if (!resultado.valida) {
      throw new ConflictException(resultado.motivo);
    }

    let atualizada: OrdemServico;
    try {
      // A métrica e o evento da transição (tempo no status, lead time) são
      // emitidos pelo repositório, no commit.
      atualizada = await this.ordemServicoRepository.transicionarStatus(
        ordemId,
        dto.status,
        'AVANCO',
        usuarioId,
        dto.observacao ?? null,
        { statusEsperados: [ordem.status] },
      );
    } catch (e) {
      throw traduzirErroDominio(e);
    }

    await this.notificador.notificar(ordemId, 'ENTREGUE');
    return atualizada;
  }
}
