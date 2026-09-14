import { tagsDeObservabilidade } from './tags';

describe('tagsDeObservabilidade', () => {
  it('lê o formato de labels do agente', () => {
    expect(
      tagsDeObservabilidade(
        'environment:production;project:tech-challenge-fiap',
      ),
    ).toEqual({ environment: 'production', project: 'tech-challenge-fiap' });
  });

  it('tolera espaços e separador sobrando no fim', () => {
    expect(tagsDeObservabilidade(' environment : production ; ')).toEqual({
      environment: 'production',
    });
  });

  it('ignora pares malformados em vez de lançar', () => {
    expect(tagsDeObservabilidade('semvalor:;:semchave;solto;ok:1')).toEqual({
      ok: '1',
    });
  });

  it('preserva ":" dentro do valor', () => {
    expect(tagsDeObservabilidade('url:https://x')).toEqual({
      url: 'https://x',
    });
  });

  it('devolve objeto vazio sem a variável', () => {
    expect(tagsDeObservabilidade(undefined)).toEqual({});
    expect(tagsDeObservabilidade('')).toEqual({});
  });
});
