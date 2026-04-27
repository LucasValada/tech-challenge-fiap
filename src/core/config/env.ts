import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function must(name: string): void {
  if (!process.env[name]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
}

export function validateEnv(): void {
  must('DATABASE_URL');
  must('JWT_SECRET');
}
