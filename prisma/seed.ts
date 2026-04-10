import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const senhaHash = await bcrypt.hash('senha123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@oficina.com' },
    update: {},
    create: {
      nome: 'Admin',
      email: 'admin@oficina.com',
      senhaHash,
    },
  });

  console.log('Seed executado. Usuário admin:', admin.email);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
