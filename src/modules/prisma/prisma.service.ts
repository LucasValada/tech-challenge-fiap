import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const rawUrl = process.env.DATABASE_URL;

    if (!rawUrl) {
      throw new Error('DATABASE_URL não está definida.');
    }

    // O RDS exige conexão TLS (`rds.force_ssl` ligado): sem SSL, o Postgres
    // recusa com "no pg_hba.conf entry ... no encryption".
    //
    // O `node-pg` recente trata `sslmode=require` como `verify-full` (valida a
    // cadeia da CA) e falha com "self-signed certificate in certificate chain",
    // porque a CA do RDS não está no trust store. Então: removemos o `sslmode`
    // da string passada ao `pg` e controlamos o TLS pelo objeto `ssl` abaixo
    // (`rejectUnauthorized: false` = encripta sem validar a CA — suficiente dentro
    // da VPC; para validar a cadeia, fornecer o bundle da RDS CA). O `sslmode`
    // permanece no segredo porque o `prisma migrate deploy` (engine nativo) o usa.
    const url = new URL(rawUrl);
    const sslRequerido =
      process.env.DATABASE_SSL === 'true' || url.searchParams.has('sslmode');
    url.searchParams.delete('sslmode');

    const pool = new Pool({
      connectionString: url.toString(),
      ...(sslRequerido ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
