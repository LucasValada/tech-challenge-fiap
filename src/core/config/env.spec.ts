import { validateEnv } from './env';

const OBRIGATORIAS = [
  'NODE_ENV',
  'APPLICATION_PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'MAIL_LAMBDA_URL',
  'MAIL_LAMBDA_TOKEN',
  'AWS_REGION',
  'SAGA_REPLIES_QUEUE_URL',
  'EXECUTION_COMMANDS_QUEUE_URL',
  'BILLING_COMMANDS_QUEUE_URL',
];

describe('validateEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const nome of OBRIGATORIAS) process.env[nome] = 'valor-de-teste';
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('passa quando todas as variáveis obrigatórias estão definidas', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it.each(OBRIGATORIAS)('falha nomeando %s quando ela está ausente', (nome) => {
    delete process.env[nome];

    expect(() => validateEnv()).toThrow(
      `Variável de ambiente obrigatória ausente: ${nome}`,
    );
  });

  it('trata variável vazia como ausente', () => {
    process.env.JWT_SECRET = '';

    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });
});
