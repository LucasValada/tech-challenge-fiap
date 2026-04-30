import { Cliente } from '../domain/entity/Client';

describe('Cliente entity', () => {
  describe('IsValidCpfCnpj', () => {
    it('valida CPF formatado corretamente', () => {
      const cliente = new Cliente(
        'João',
        null,
        null,
        '123.456.789-00',
        'FISICA',
      );
      expect(cliente.IsValidCpfCnpj()).toBe(true);
    });

    it('rejeita CPF sem formatação', () => {
      const cliente = new Cliente('João', null, null, '12345678900', 'FISICA');
      expect(cliente.IsValidCpfCnpj()).toBe(false);
    });

    it('valida CNPJ formatado corretamente', () => {
      const cliente = new Cliente(
        'Empresa',
        null,
        null,
        '12.345.678/0001-90',
        'JURIDICA',
      );
      expect(cliente.IsValidCpfCnpj()).toBe(true);
    });

    it('rejeita CNPJ sem formatação', () => {
      const cliente = new Cliente(
        'Empresa',
        null,
        null,
        '12345678000190',
        'JURIDICA',
      );
      expect(cliente.IsValidCpfCnpj()).toBe(false);
    });
  });

  describe('IsValidEmail', () => {
    it('valida email correto', () => {
      const cliente = new Cliente(
        'João',
        null,
        'joao@email.com',
        '123.456.789-00',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(true);
    });

    it('rejeita email sem @', () => {
      const cliente = new Cliente(
        'João',
        null,
        'joaoemail.com',
        '123.456.789-00',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(false);
    });

    it('retorna false quando email é null', () => {
      const cliente = new Cliente(
        'João',
        null,
        null,
        '123.456.789-00',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(false);
    });
  });
});
