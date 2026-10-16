import { contextoDoFluxo, executarNoFluxo } from './contexto-fluxo';

describe('contexto do fluxo', () => {
  it('fica vazio fora de um consumo de mensagem', () => {
    expect(contextoDoFluxo()).toEqual({});
  });

  it('expõe o correlationId e a OS durante a ação, inclusive após await', async () => {
    const vistos = await executarNoFluxo(
      { correlationId: 'fluxo-1', osId: 'os-1' },
      async () => {
        const antes = contextoDoFluxo();
        await Promise.resolve();
        return [antes, contextoDoFluxo()];
      },
    );

    expect(vistos).toEqual([
      { correlationId: 'fluxo-1', osId: 'os-1' },
      { correlationId: 'fluxo-1', osId: 'os-1' },
    ]);
    expect(contextoDoFluxo()).toEqual({});
  });

  it('isola fluxos que rodam ao mesmo tempo', async () => {
    const [a, b] = await Promise.all([
      executarNoFluxo({ correlationId: 'a' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return contextoDoFluxo().correlationId;
      }),
      executarNoFluxo({ correlationId: 'b' }, () =>
        Promise.resolve(contextoDoFluxo().correlationId),
      ),
    ]);

    expect([a, b]).toEqual(['a', 'b']);
  });
});
