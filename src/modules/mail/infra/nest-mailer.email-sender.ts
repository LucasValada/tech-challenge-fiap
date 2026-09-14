import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailSender,
  NotificacaoStatusEmailData,
  OrcamentoEmailData,
} from '../domain/service/email-sender';

@Injectable()
export class NestMailerEmailSender implements EmailSender {
  private readonly logger = new Logger(NestMailerEmailSender.name);

  constructor(private readonly config: ConfigService) {}

  async enviarOrcamento(data: OrcamentoEmailData): Promise<void> {
    const linhasServicos = data.servicos
      .map(
        (s) => `  - ${s.nome} (x${s.quantidade}): R$ ${s.subtotal.toFixed(2)}`,
      )
      .join('\n');

    const linhasItens = data.itens
      .map(
        (i) => `  - ${i.nome} (x${i.quantidade}): R$ ${i.subtotal.toFixed(2)}`,
      )
      .join('\n');

    const texto = [
      `Olá ${data.clienteNome},`,
      '',
      `Segue o orçamento da Ordem de Serviço ${data.codigoOS} referente ao veículo de placa ${data.placa}:`,
      '',
      linhasServicos ? `Serviços:\n${linhasServicos}` : '',
      linhasItens ? `Peças/Insumos:\n${linhasItens}` : '',
      '',
      `Valor dos serviços: R$ ${data.valorServicos.toFixed(2)}`,
      `Valor das peças: R$ ${data.valorPecas.toFixed(2)}`,
      `Total: R$ ${data.valorTotal.toFixed(2)}`,
      '',
      `Para aprovar ou rejeitar o orçamento, autentique-se com o seu CPF para`,
      `obter o token de acesso e utilize os endpoints protegidos:`,
      `  Aprovar:  POST /ordens-servico/minhas/{id}/aprovar`,
      `  Rejeitar: POST /ordens-servico/minhas/{id}/rejeitar`,
      `Envie o token no header Authorization; o {id} da OS ${data.codigoOS} pode`,
      `ser obtido em GET /ordens-servico/minhas.`,
      '',
      'Atenciosamente,',
      'Oficina SOAT',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    await this.enviar(
      data.clienteEmail,
      `Orçamento OS ${data.codigoOS} - Oficina SOAT`,
      texto,
      `orçamento (OS: ${data.codigoOS})`,
    );
  }

  async enviarNotificacaoFinalizacao(
    data: NotificacaoStatusEmailData,
  ): Promise<void> {
    await this.enviarNotificacao(
      data,
      `OS ${data.codigoOS} finalizada - Oficina SOAT`,
      [
        `O serviço da Ordem de Serviço ${data.codigoOS}, referente ao veículo de placa ${data.placa}, foi finalizado.`,
        'Já pode passar na oficina para retirar o veículo.',
      ],
      `notificação de finalização (OS: ${data.codigoOS})`,
    );
  }

  async enviarNotificacaoEntrega(
    data: NotificacaoStatusEmailData,
  ): Promise<void> {
    await this.enviarNotificacao(
      data,
      `OS ${data.codigoOS} entregue - Oficina SOAT`,
      [
        `Confirmamos a entrega do veículo de placa ${data.placa} referente à Ordem de Serviço ${data.codigoOS}.`,
        'Obrigado pela preferência!',
      ],
      `notificação de entrega (OS: ${data.codigoOS})`,
    );
  }

  private async enviarNotificacao(
    data: NotificacaoStatusEmailData,
    subject: string,
    linhas: string[],
    contexto: string,
  ): Promise<void> {
    await this.enviar(
      data.clienteEmail,
      subject,
      [
        `Olá ${data.clienteNome},`,
        '',
        ...linhas,
        '',
        'Atenciosamente,',
        'Oficina SOAT',
      ].join('\n'),
      contexto,
    );
  }

  /**
   * Envio de e-mail via função serverless: o app não fala SMTP direto — faz um
   * POST autenticado (`x-mail-api-token`) para a Lambda de notificações, que
   * cuida do SMTP. Best-effort: uma falha é apenas logada e nunca bloqueia a
   * transição de status da OS. Timeout de 15s para não segurar a requisição.
   */
  private async enviar(
    to: string,
    subject: string,
    text: string,
    contexto: string,
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(
        this.config.getOrThrow<string>('MAIL_LAMBDA_URL'),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-mail-api-token':
              this.config.getOrThrow<string>('MAIL_LAMBDA_TOKEN'),
          },
          body: JSON.stringify({ to, subject, text }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Lambda respondeu HTTP ${response.status}`);
      }
      this.logger.log(`Email enviado via Lambda: ${contexto} para ${to}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar ${contexto} para ${to}: ${error}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
