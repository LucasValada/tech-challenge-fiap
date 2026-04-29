import { Usuario } from './User';

describe('Usuario entity', () => {
  it('instancia com todos os campos', () => {
    const now = new Date();
    const user = new Usuario('id-1', 'Admin', 'admin@email.com', 'hash', now, now);

    expect(user.id).toBe('id-1');
    expect(user.nome).toBe('Admin');
    expect(user.email).toBe('admin@email.com');
    expect(user.senhaHash).toBe('hash');
  });
});
