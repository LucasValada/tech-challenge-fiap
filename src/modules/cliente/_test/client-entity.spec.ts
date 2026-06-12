import { Cliente } from '../domain/entity/Client';

describe('Cliente entity', () => {
  describe('IsValidEmail', () => {
    it('valida email correto', () => {
      const cliente = new Cliente(
        'João',
        null,
        'joao@email.com',
        '529.982.247-25',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(true);
    });

    it('rejeita email sem @', () => {
      const cliente = new Cliente(
        'João',
        null,
        'joaoemail.com',
        '529.982.247-25',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(false);
    });

    it('retorna false quando email é null', () => {
      const cliente = new Cliente(
        'João',
        null,
        null,
        '529.982.247-25',
        'FISICA',
      );
      expect(cliente.IsValidEmail()).toBe(false);
    });
  });
});
