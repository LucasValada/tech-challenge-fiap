import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { NestMailerEmailSender } from './nest-mailer.email-sender';
import { NotificacaoStatusEmailData } from '../domain/service/email-sender';

const mockMailerService = {
  sendMail: jest.fn(),
};

const baseData: NotificacaoStatusEmailData = {
  clienteNome: 'João da Silva',
  clienteEmail: 'joao@email.com',
  codigoOS: 'OS-2026-000001',
  placa: 'ABC1D23',
};

type MetodoNotificacao =
  | 'enviarNotificacaoFinalizacao'
  | 'enviarNotificacaoEntrega';

interface CasoNotificacao {
  metodo: MetodoNotificacao;
  assuntoEsperado: string;
  palavraChaveTexto: string;
}

const casos: CasoNotificacao[] = [
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

  describe.each(casos)(
    '$metodo',
    ({ metodo, assuntoEsperado, palavraChaveTexto }) => {
      it('envia email com assunto, destinatário e texto corretos', async () => {
        mockMailerService.sendMail.mockResolvedValue({ messageId: 'mid-1' });

        await sender[metodo](baseData);

        expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
        const payload = mockMailerService.sendMail.mock.calls[0][0];
        expect(payload.to).toBe(baseData.clienteEmail);
        expect(payload.subject).toBe(assuntoEsperado);
        expect(payload.text).toContain(baseData.clienteNome);
        expect(payload.text).toContain(baseData.codigoOS);
        expect(payload.text).toContain(baseData.placa);
        expect(payload.text).toContain(palavraChaveTexto);
      });

      it('não lança quando o envio falha (best-effort)', async () => {
        mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

        await expect(sender[metodo](baseData)).resolves.toBeUndefined();
      });
    },
  );
});
