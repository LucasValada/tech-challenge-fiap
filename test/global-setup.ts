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

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  global.__POSTGRES_CONTAINER__ = container;
}
