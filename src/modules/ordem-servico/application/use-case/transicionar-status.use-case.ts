import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import { EmailSender } from '../../../mail/domain/service/email-sender';
import { classificarTransicao } from '../../domain/services/maquinaDeEstadosOS';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { TransicionarStatusDto } from '../dto/transicionar-status.dto';

@Injectable()
export class TransicionarStatusUseCase {
  private readonly logger = new Logger(TransicionarStatusUseCase.name);

  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
    @Inject('EMAIL_SENDER')
    private readonly emailSender: EmailSender,
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
    const resultado = classificarTransicao(ordem.status, dto.status);
    if (!resultado.valida) {
      throw new ConflictException(resultado.motivo);
    }
    const atualizada = await this.ordemServicoRepository.transicionarStatus(
      ordemId,
      dto.status,
      resultado.tipo!,
      usuarioId,
      dto.observacao ?? null,
    );

    await this.dispararNotificacaoStatus(ordemId, dto.status);

    return atualizada;
  }

  private async dispararNotificacaoStatus(
    ordemId: string,
    novoStatus: StatusOrdemServico,
  ): Promise<void> {
    if (novoStatus !== 'FINALIZADA' && novoStatus !== 'ENTREGUE') return;

    try {
      const detalhes =
        await this.ordemServicoRepository.findByIdComDetalhes(ordemId);
      if (!detalhes) return;

      const cliente = await this.clienteRepository.findById(
        detalhes.cliente.id,
      );
      if (!cliente?.email) return;

      const payload = {
        clienteNome: detalhes.cliente.nome,
        clienteEmail: cliente.email,
        codigoOS: detalhes.codigo,
        placa: detalhes.veiculo.placa,
      };

      if (novoStatus === 'FINALIZADA') {
        await this.emailSender.enviarNotificacaoFinalizacao(payload);
      } else {
        await this.emailSender.enviarNotificacaoEntrega(payload);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao notificar transição para ${novoStatus} (OS: ${ordemId}): ${String(error)}`,
      );
    }
  }
}
