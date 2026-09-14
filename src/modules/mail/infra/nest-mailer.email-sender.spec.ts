import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestMailerEmailSender } from './nest-mailer.email-sender';
import {
  NotificacaoStatusEmailData,
  OrcamentoEmailData,
} from '../domain/service/email-sender';

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

const orcamentoData: OrcamentoEmailData = {
  ...baseNotificacao,
  servicos: [{ nome: 'Alinhamento', quantidade: 1, subtotal: 150 }],
  itens: [{ nome: 'Filtro', quantidade: 2, subtotal: 80 }],
  valorServicos: 150,
  valorPecas: 80,
  valorTotal: 230,
};

function corpoDaChamada(chamada = 0): { to: string; subject: string; text: string } {
  const init = fetchMock.mock.calls[chamada][1] as RequestInit;
  return JSON.parse(init.body as string);
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

  describe('enviarOrcamento', () => {
    it('faz POST autenticado para a Lambda com o corpo do orçamento', async () => {
      await sender.enviarOrcamento(orcamentoData);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(MAIL_URL);
      expect(init.method).toBe('POST');
      expect(
        (init.headers as Record<string, string>)['x-mail-api-token'],
      ).toBe(MAIL_TOKEN);

      const payload = corpoDaChamada();
      expect(payload.to).toBe(orcamentoData.clienteEmail);
      expect(payload.subject).toBe(
        `Orçamento OS ${orcamentoData.codigoOS} - Oficina SOAT`,
      );
      expect(payload.text).toContain('Alinhamento');
      expect(payload.text).toContain('Filtro');
      expect(payload.text).toContain('Total: R$ 230.00');
      expect(payload.text).toContain(orcamentoData.placa);
      expect(payload.text).toContain('/ordens-servico/minhas/{id}/aprovar');
      expect(payload.text).toContain('/ordens-servico/minhas/{id}/rejeitar');
    });

    it('funciona quando não há serviços nem itens (linhas condicionais)', async () => {
      await sender.enviarOrcamento({
        ...orcamentoData,
        servicos: [],
        itens: [],
        valorServicos: 0,
        valorPecas: 0,
        valorTotal: 0,
      });

      expect(corpoDaChamada().text).toContain('Total: R$ 0.00');
    });

    it('não lança quando a rede falha (best-effort)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      await expect(
        sender.enviarOrcamento(orcamentoData),
      ).resolves.toBeUndefined();
    });

    it('não lança quando a Lambda responde erro HTTP (best-effort)', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

      await expect(
        sender.enviarOrcamento(orcamentoData),
      ).resolves.toBeUndefined();
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

        await expect(
          sender[metodo](baseNotificacao),
        ).resolves.toBeUndefined();
      });
    },
  );
});
