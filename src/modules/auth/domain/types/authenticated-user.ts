export type TipoUsuarioAutenticado = 'admin' | 'cliente';

export interface AuthenticatedUser {
  id: string;
  tipo: TipoUsuarioAutenticado;
  // Preenchido para admin (login por email/senha).
  email?: string;
  // Preenchidos para cliente (autenticação por CPF via Lambda).
  cpf?: string;
  nome?: string;
}
