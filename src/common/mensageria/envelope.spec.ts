import { criarEnvelope, EnvelopeInvalidoError, lerEnvelope } from './envelope';

describe('envelope', () => {
  it('cria o envelope com id único e data em ISO 8601', () => {
    const agora = new Date('2026-10-20T14:03:00.000Z');
    const a = criarEnvelope(
      'DiagnosticoIniciado',
      'os-1',
      'fluxo-1',
      { x: 1 },
      agora,
    );
    const b = criarEnvelope(
      'DiagnosticoIniciado',
      'os-1',
      'fluxo-1',
      { x: 1 },
      agora,
    );

    expect(a).toMatchObject({
      correlationId: 'fluxo-1',
      osId: 'os-1',
      tipo: 'DiagnosticoIniciado',
      ocorridoEm: '2026-10-20T14:03:00.000Z',
      payload: { x: 1 },
    });
    expect(a.messageId).not.toEqual(b.messageId);
  });

  it('lê de volta um envelope serializado', () => {
    const original = criarEnvelope('IniciarReparo', 'os-1', 'fluxo-1', {
      codigo: 'OS-2026-000001',
    });

    expect(lerEnvelope(JSON.stringify(original))).toEqual(original);
  });

  it.each([
    ['corpo vazio', undefined],
    ['corpo que não é JSON', 'texto'],
    ['JSON que não é objeto', '42'],
    [
      'sem tipo',
      JSON.stringify({
        messageId: '1',
        correlationId: 'c',
        osId: 'o',
        ocorridoEm: 't',
        payload: {},
      }),
    ],
    [
      'tipo vazio',
      JSON.stringify({
        messageId: '1',
        correlationId: 'c',
        osId: 'o',
        tipo: '',
        ocorridoEm: 't',
        payload: {},
      }),
    ],
    [
      'sem payload',
      JSON.stringify({
        messageId: '1',
        correlationId: 'c',
        osId: 'o',
        tipo: 'X',
        ocorridoEm: 't',
      }),
    ],
  ])('recusa %s', (_caso, corpo) => {
    expect(() => lerEnvelope(corpo)).toThrow(EnvelopeInvalidoError);
  });
});
