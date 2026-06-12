import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

  must('MAIL_FROM');
  must('MAIL_HOST');
  must('MAIL_USER');
  must('MAIL_PASS');
  must('MAIL_PORT');
}
