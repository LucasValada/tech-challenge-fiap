import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { NestMailerEmailSender } from './nest-mailer.email-sender';
import {
  NotificacaoStatusEmailData,
  OrcamentoEmailData,
} from '../domain/service/email-sender';

jest.mock('nodemailer', () => ({
  getTestMessageUrl: jest.fn((info) =>
    info?.messageId === 'mid-with-preview'
      ? 'https://ethereal.email/message/preview'
      : null,
  ),
}));

const mockMailerService = {
  sendMail: jest.fn(),
};

const baseNotificacao: NotificacaoStatusEmailData = {
  clienteNome: 'João da Silva',
  clienteEmail: 'joao@email.com',
  codigoOS: 'OS-2026-000001',
  placa: 'ABC1D23',
};

const orcamentoData: OrcamentoEmailData = {
  ...baseNotificacao,
  servicos: [{ nome: 'Alinhamento', quantidade: 1, subtotal: 150 }],
  itens: [{ nome: 'Filtro', quantidade: 2, subtotal: 80 }],
  valorServicos: 150,
  valorPecas: 80,
  valorTotal: 230,
};

describe('NestMailerEmailSender', () => {
  let sender: NestMailerEmailSender;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NestMailerEmailSender,
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    sender = moduleRef.get(NestMailerEmailSender);
    jest.clearAllMocks();
  });

  describe('enviarOrcamento', () => {
    it('envia email com subject, to e texto contendo linhas de serviços/itens e totais', async () => {
      mockMailerService.sendMail.mockResolvedValue({
        messageId: 'mid-with-preview',
        accepted: ['joao@email.com'],
      });

      await sender.enviarOrcamento(orcamentoData);

      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
      const payload = mockMailerService.sendMail.mock.calls[0][0];
      expect(payload.to).toBe(orcamentoData.clienteEmail);
      expect(payload.subject).toBe(
        `Orçamento OS ${orcamentoData.codigoOS} - Oficina SOAT`,
      );
      expect(payload.text).toContain('Alinhamento');
      expect(payload.text).toContain('Filtro');
      expect(payload.text).toContain('Total: R$ 230.00');
      expect(payload.text).toContain(orcamentoData.placa);
      expect(payload.text).toContain(
        `/public/ordens-servico/${orcamentoData.codigoOS}/aprovar`,
      );
    });

    it('funciona quando não há serviços nem itens (linhas condicionais)', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mid-x' });

      await sender.enviarOrcamento({
        ...orcamentoData,
        servicos: [],
        itens: [],
        valorServicos: 0,
        valorPecas: 0,
        valorTotal: 0,
      });

      const payload = mockMailerService.sendMail.mock.calls[0][0];
      expect(payload.text).toContain('Total: R$ 0.00');
    });

    it('não lança quando SMTP falha (best-effort)', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(sender.enviarOrcamento(orcamentoData)).resolves.toBeUndefined();
    });
  });

  type MetodoNotificacao =
    | 'enviarNotificacaoFinalizacao'
    | 'enviarNotificacaoEntrega';

  const casosNotificacao: Array<{
    metodo: MetodoNotificacao;
    assuntoEsperado: string;
    palavraChaveTexto: string;
  }> = [
    {
      metodo: 'enviarNotificacaoFinalizacao',
      assuntoEsperado: 'OS OS-2026-000001 finalizada - Oficina SOAT',
      palavraChaveTexto: 'finalizado',
    },
    {
      metodo: 'enviarNotificacaoEntrega',
      assuntoEsperado: 'OS OS-2026-000001 entregue - Oficina SOAT',
      palavraChaveTexto: 'entrega',
    },
  ];

  describe.each(casosNotificacao)(
    '$metodo',
    ({ metodo, assuntoEsperado, palavraChaveTexto }) => {
      it('envia email com assunto, destinatário e texto corretos', async () => {
        mockMailerService.sendMail.mockResolvedValue({
          messageId: 'mid-with-preview',
        });

        await sender[metodo](baseNotificacao);

        expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
        const payload = mockMailerService.sendMail.mock.calls[0][0];
        expect(payload.to).toBe(baseNotificacao.clienteEmail);
        expect(payload.subject).toBe(assuntoEsperado);
        expect(payload.text).toContain(baseNotificacao.clienteNome);
        expect(payload.text).toContain(baseNotificacao.codigoOS);
        expect(payload.text).toContain(baseNotificacao.placa);
        expect(payload.text).toContain(palavraChaveTexto);
      });

      it('não lança quando o envio falha (best-effort)', async () => {
        mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

        await expect(sender[metodo](baseNotificacao)).resolves.toBeUndefined();
      });
    },
  );
});
