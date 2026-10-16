import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestMailerEmailSender } from './nest-mailer.email-sender';
import { NotificacaoStatusEmailData } from '../domain/service/email-sender';

const MAIL_URL = 'https://lambda.example/mail';
const MAIL_TOKEN = 'token-teste';

const mockConfig = {
  getOrThrow: jest.fn(),
};

const fetchMock = jest.fn();
// A aplicação usa o fetch global do Node; substituímos por um mock nos testes.
global.fetch = fetchMock as unknown as typeof fetch;

const baseNotificacao: NotificacaoStatusEmailData = {
  clienteNome: 'João da Silva',
  clienteEmail: 'joao@email.com',
  codigoOS: 'OS-2026-000001',
  placa: 'ABC1D23',
};

function corpoDaChamada(chamada = 0): {
  to: string;
  subject: string;
  text: string;
} {
  const [, init] = fetchMock.mock.calls[chamada] as [unknown, RequestInit];
  return JSON.parse(init.body as string) as {
    to: string;
    subject: string;
    text: string;
  };
}

describe('NestMailerEmailSender', () => {
  let sender: NestMailerEmailSender;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.getOrThrow.mockImplementation((chave: string) =>
      chave === 'MAIL_LAMBDA_URL' ? MAIL_URL : MAIL_TOKEN,
    );
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NestMailerEmailSender,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    sender = moduleRef.get(NestMailerEmailSender);
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
      it('faz POST para a Lambda com assunto, destinatário e texto corretos', async () => {
        await sender[metodo](baseNotificacao);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const payload = corpoDaChamada();
        expect(payload.to).toBe(baseNotificacao.clienteEmail);
        expect(payload.subject).toBe(assuntoEsperado);
        expect(payload.text).toContain(baseNotificacao.clienteNome);
        expect(payload.text).toContain(baseNotificacao.codigoOS);
        expect(payload.text).toContain(baseNotificacao.placa);
        expect(payload.text).toContain(palavraChaveTexto);
      });

      it('não lança quando o envio falha (best-effort)', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network down'));

        await expect(sender[metodo](baseNotificacao)).resolves.toBeUndefined();
      });

      it('não lança quando a Lambda responde erro HTTP (best-effort)', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

        await expect(sender[metodo](baseNotificacao)).resolves.toBeUndefined();
      });
    },
  );
});
