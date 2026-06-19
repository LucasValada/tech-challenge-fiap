export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('Credenciais inválidas');
    this.name = 'CredenciaisInvalidasError';
  }
}
