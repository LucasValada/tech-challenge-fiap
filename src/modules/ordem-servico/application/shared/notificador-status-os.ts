import { Inject, Injectable, Logger } from '@nestjs/common';
import { registrarFalha } from '../../../../common/observability';
import { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import { EmailSender } from '../../../mail/domain/service/email-sender';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';

export type StatusNotificado = 'FINALIZADA' | 'ENTREGUE';

/**
 * E-mail ao cliente quando a OS é finalizada (pela Saga, no ReparoConcluido) e
 * quando o veículo é entregue (pela rota de transição). O orçamento e o link de
 * pagamento são enviados pelo Billing.
 *
 * Best-effort, como desde a Fase 3: sem e-mail no cadastro nada é enviado, e
 * uma falha no envio só é registrada — nunca desfaz a transição.
 */
@Injectable()
export class NotificadorStatusOS {
  private readonly logger = new Logger(NotificadorStatusOS.name);

  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
    @Inject('EMAIL_SENDER')
    private readonly emailSender: EmailSender,
  ) {}

  async notificar(ordemId: string, status: StatusNotificado): Promise<void> {
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

      if (status === 'FINALIZADA') {
        await this.emailSender.enviarNotificacaoFinalizacao(payload);
      } else {
        await this.emailSender.enviarNotificacaoEntrega(payload);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao notificar transição para ${status} (OS: ${ordemId}): ${String(error)}`,
      );

      // Prefixo `integracao.` porque o destinatário é um serviço externo (SMTP):
      // é assim que o painel de integrações separa o que quebrou fora de casa.
      registrarFalha('integracao.email.falha', error, {
        ordem_id: ordemId,
        status_novo: status,
      });
    }
  }
}
