import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pool, PoolConfig } from 'pg';
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
    // O `node-pg` recente trata `sslmode=require` como `verify-full` e falha se a
    // CA do RDS não está no trust store. Então removemos o `sslmode` da string e
    // controlamos o TLS pelo objeto `ssl`: com o bundle da CA do RDS presente,
    // validamos a cadeia (`rejectUnauthorized: true`); sem o bundle (ex.: dev
    // local), apenas encripta. O `sslmode` permanece no segredo porque o
    // `prisma migrate deploy` (engine nativo) o usa.
    const url = new URL(rawUrl);
    const sslRequerido =
      process.env.DATABASE_SSL === 'true' || url.searchParams.has('sslmode');
    url.searchParams.delete('sslmode');

    const poolConfig: PoolConfig = { connectionString: url.toString() };
    if (sslRequerido) {
      const caPath =
        process.env.DATABASE_CA_PATH ??
        path.resolve(process.cwd(), 'certs', 'rds-global-bundle.pem');
      if (fs.existsSync(caPath)) {
        poolConfig.ssl = {
          ca: fs.readFileSync(caPath, 'utf8'),
          rejectUnauthorized: true,
        };
      } else {
        new Logger(PrismaService.name).warn(
          `Bundle da CA do RDS ausente em ${caPath}; conectando com TLS sem validar a CA.`,
        );
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    }

    const pool = new Pool(poolConfig);
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
