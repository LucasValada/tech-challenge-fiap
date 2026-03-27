// config/env.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function must(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Env ${name} is missing`);
  return val;
}

// variables to export
// export const using must function to validate

// export const PORT = must('APPLICATION_PORT');
