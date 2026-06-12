import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService, NotificacaoStatusEmailData } from './mail.service';

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

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = moduleRef.get(MailService);
    jest.clearAllMocks();
  });

  describe.each(casos)('$metodo', ({ metodo, assuntoEsperado, palavraChaveTexto }) => {
    it('envia email com assunto, destinatário e texto corretos', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mid-1' });

      await service[metodo](baseData);

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

      await expect(service[metodo](baseData)).resolves.toBeUndefined();
    });
  });
});
