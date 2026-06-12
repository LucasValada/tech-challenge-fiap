import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import {
  MailService,
  NotificacaoStatusEmailData,
} from './mail.service';

const mockMailerService = {
  sendMail: jest.fn(),
};

const baseData: NotificacaoStatusEmailData = {
  clienteNome: 'João da Silva',
  clienteEmail: 'joao@email.com',
  codigoOS: 'OS-2026-000001',
  placa: 'ABC1D23',
};

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

  describe('enviarNotificacaoFinalizacao', () => {
    it('envia email com assunto e texto da finalização', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mid-1' });

      await service.enviarNotificacaoFinalizacao(baseData);

      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
      const payload = mockMailerService.sendMail.mock.calls[0][0];
      expect(payload.to).toBe('joao@email.com');
      expect(payload.subject).toBe('OS OS-2026-000001 finalizada - Oficina SOAT');
      expect(payload.text).toContain('João da Silva');
      expect(payload.text).toContain('OS-2026-000001');
      expect(payload.text).toContain('ABC1D23');
      expect(payload.text).toContain('finalizado');
    });

    it('não lança quando o envio falha (best-effort)', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.enviarNotificacaoFinalizacao(baseData),
      ).resolves.toBeUndefined();
    });
  });

  describe('enviarNotificacaoEntrega', () => {
    it('envia email com assunto e texto da entrega', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mid-2' });

      await service.enviarNotificacaoEntrega(baseData);

      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
      const payload = mockMailerService.sendMail.mock.calls[0][0];
      expect(payload.to).toBe('joao@email.com');
      expect(payload.subject).toBe('OS OS-2026-000001 entregue - Oficina SOAT');
      expect(payload.text).toContain('João da Silva');
      expect(payload.text).toContain('OS-2026-000001');
      expect(payload.text).toContain('ABC1D23');
      expect(payload.text).toContain('entrega');
    });

    it('não lança quando o envio falha (best-effort)', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.enviarNotificacaoEntrega(baseData),
      ).resolves.toBeUndefined();
    });
  });
});
