import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface OrcamentoEmailData {
  clienteNome: string;
  clienteEmail: string;
  codigoOS: string;
  placa: string;
  servicos: { nome: string; quantidade: number; subtotal: number }[];
  itens: { nome: string; quantidade: number; subtotal: number }[];
  valorServicos: number;
  valorPecas: number;
  valorTotal: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async enviarOrcamento(data: OrcamentoEmailData): Promise<void> {
    const linhasServicos = data.servicos
      .map(
        (s) =>
          `  - ${s.nome} (x${s.quantidade}): R$ ${s.subtotal.toFixed(2)}`,
      )
      .join('\n');

    const linhasItens = data.itens
      .map(
        (i) =>
          `  - ${i.nome} (x${i.quantidade}): R$ ${i.subtotal.toFixed(2)}`,
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
      `Para aprovar o orçamento, utilize o endpoint:`,
      `POST /public/ordens-servico/${data.codigoOS}/aprovar`,
      `com a placa do veículo no body: { "placa": "${data.placa}" }`,
      '',
      'Atenciosamente,',
      'Oficina SOAT',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    try {
      const info = await this.mailerService.sendMail({
        to: data.clienteEmail,
        subject: `Orçamento OS ${data.codigoOS} - Oficina SOAT`,
        text: texto,
      });

      this.logger.log(
        `Email de orçamento enviado para ${data.clienteEmail} (OS: ${data.codigoOS})`,
      );

      if (info?.messageId) {
        this.logger.log(`Message ID: ${info.messageId}`);
      }
      if (info?.accepted) {
        this.logger.log(`Accepted: ${info.accepted}`);
      }

      const previewUrl =
        (await (await import('nodemailer')).getTestMessageUrl(info)) || null;
      if (previewUrl) {
        this.logger.log(`Preview URL (Ethereal): ${previewUrl}`);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de orçamento para ${data.clienteEmail}: ${error}`,
      );
    }
  }
}
