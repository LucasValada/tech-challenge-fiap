import dotenv from 'dotenv';
import path from 'node:path';

// `quiet`: o dotenv 17 imprime "injecting env (N) from ..." em texto puro no
// stdout a cada subida — a primeira linha do log deixava de ser JSON.
//
// Caminho a partir do diretório de trabalho, como o ConfigModule faz: o
// `__dirname` do código compilado é dist/src/core/config, e o `../../.env`
// antigo apontava para dist/src/.env, que nunca existe. No contêiner não há
// .env (o .dockerignore o exclui) e as variáveis vêm do ambiente.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

function must(name: string): void {
  if (!process.env[name]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
}

export function validateEnv(): void {
  must('NODE_ENV');
  must('APPLICATION_PORT');

  must('DATABASE_URL');
  must('JWT_SECRET');
  must('JWT_EXPIRES_IN');

  // Notificações são serverless: o app envia por HTTP para a Lambda de e-mail
  // (o SMTP fica na Lambda). Só a URL e o token de chamada são obrigatórios.
  must('MAIL_LAMBDA_URL');
  must('MAIL_LAMBDA_TOKEN');

  must('WEBHOOK_ORCAMENTO_TOKEN');
}
