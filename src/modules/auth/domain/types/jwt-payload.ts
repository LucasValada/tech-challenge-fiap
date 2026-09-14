export interface JwtPayload {
  sub: string;
  // Presente nos tokens administrativos (login por email/senha).
  email?: string;
  // Presente nos tokens emitidos pela Lambda de autenticação por CPF.
  tipo?: 'cliente';
  cpf?: string;
  nome?: string;
}
