import { inicioDoStatusAtual } from './inicioDoStatusAtual';

describe('inicioDoStatusAtual', () => {
  const t = (minuto: number) => new Date(Date.UTC(2026, 9, 20, 10, minuto));

  it('é a entrada mais antiga da sequência mais recente com o mesmo status', () => {
    // Do mais recente para o mais antigo: duas tentativas de pagamento
    // recusadas registradas depois de a OS entrar em AGUARDANDO_PAGAMENTO.
    const historico = [
      { status: 'AGUARDANDO_PAGAMENTO', createdAt: t(30) },
      { status: 'AGUARDANDO_PAGAMENTO', createdAt: t(20) },
      { status: 'AGUARDANDO_PAGAMENTO', createdAt: t(10) },
      { status: 'AGUARDANDO_APROVACAO', createdAt: t(5) },
    ];

    expect(inicioDoStatusAtual(historico)).toEqual({
      status: 'AGUARDANDO_PAGAMENTO',
      createdAt: t(10),
    });
  });

  it('com uma entrada só, é ela mesma', () => {
    const historico = [{ status: 'RECEBIDA', createdAt: t(0) }];

    expect(inicioDoStatusAtual(historico)).toBe(historico[0]);
  });

  it('sem histórico, não há início', () => {
    expect(inicioDoStatusAtual([])).toBeUndefined();
  });
});
