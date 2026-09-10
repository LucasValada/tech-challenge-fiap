import { ConfigService } from '@nestjs/config';
import { NestMailerEmailSender } from './nest-mailer.email-sender';

const fetchMock = jest.fn();
global.fetch = fetchMock;

describe('NestMailerEmailSender', () => {
  const config = { getOrThrow: jest.fn((key: string) => key === 'MAIL_LAMBDA_URL' ? 'https://api.example/mail' : 'token-interno') } as unknown as ConfigService;
  const data = {
    clienteNome: 'João da Silva', clienteEmail: 'joao@email.com', codigoOS: 'OS-2026-000001', placa: 'ABC1D23',
    servicos: [{ nome: 'Alinhamento', quantidade: 1, subtotal: 150 }], itens: [{ nome: 'Filtro', quantidade: 2, subtotal: 80 }],
    valorServicos: 150, valorPecas: 80, valorTotal: 230,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  it('envia orçamento para a Lambda com token e payload esperado', async () => {
    await new NestMailerEmailSender(config).enviarOrcamento(data);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example/mail', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'x-mail-api-token': 'token-interno' }),
    }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ to: data.clienteEmail, subject: 'Orçamento OS OS-2026-000001 - Oficina SOAT' });
    expect(body.text).toContain('Alinhamento');
    expect(body.text).toContain('Filtro');
  });

  it('mantém o fluxo best-effort quando a Lambda falha', async () => {
    fetchMock.mockRejectedValue(new Error('Lambda indisponível'));
    await expect(new NestMailerEmailSender(config).enviarNotificacaoEntrega(data)).resolves.toBeUndefined();
  });
});
