import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';

declare global {
  var __POSTGRES_CONTAINER__: import('@testcontainers/postgresql').StartedPostgreSqlContainer;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('oficina_test')
    .withUsername('oficina_test')
    .withPassword('oficina_test')
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;

  // Notificações são serverless e best-effort; a Lambda de e-mail não existe no
  // e2e. Um endpoint local recusado faz o envio falhar rápido (ECONNREFUSED),
  // exercitando o caminho real de fetch+catch sem segurar o teste nem exigir a
  // Lambda. `??=` respeita valores já definidos no ambiente.
  process.env.MAIL_LAMBDA_URL ??= 'http://127.0.0.1:9/mail';
  process.env.MAIL_LAMBDA_TOKEN ??= 'e2e-dummy-token';

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  global.__POSTGRES_CONTAINER__ = container;
}
