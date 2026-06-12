import { validate } from 'class-validator';
import { IsCpfCnpj } from './is-cpf-cnpj.validator';

class Target {
  @IsCpfCnpj()
  doc!: string;

  constructor(doc: string) {
    this.doc = doc;
  }
}

describe('IsCpfCnpj', () => {
  it.each([
    ['52998224725', 'CPF válido sem pontuação'],
    ['529.982.247-25', 'CPF válido com pontuação'],
    ['11444777000161', 'CNPJ válido sem pontuação'],
    ['11.444.777/0001-61', 'CNPJ válido com pontuação'],
  ])('aceita %s (%s)', async (doc) => {
    const errors = await validate(new Target(doc));
    expect(errors).toHaveLength(0);
  });

  it.each([
    ['11122233344', 'CPF com dígito verificador inválido'],
    ['11111111111', 'CPF com todos os dígitos iguais'],
    ['12345678901', 'CPF aleatório inválido'],
    ['00000000000000', 'CNPJ com todos zeros'],
    ['abc', 'string não numérica'],
    ['', 'string vazia'],
    ['123', 'string com tamanho fora dos válidos'],
  ])('rejeita %s (%s)', async (doc) => {
    const errors = await validate(new Target(doc));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isCpfCnpj).toContain('CPF ou CNPJ válido');
  });

  it('rejeita valor não-string', async () => {
    const errors = await validate(new Target(12345 as unknown as string));
    expect(errors.length).toBeGreaterThan(0);
  });
});
