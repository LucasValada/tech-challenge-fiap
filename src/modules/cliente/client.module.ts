import { Module } from '@nestjs/common';
import { ClienteController } from './cliente.controller';
import { clientServices } from './application/use-case/cliente.use-case';
import { PrismaClientRepository } from '../../infra/database/prisma/repositories/prisma.client.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClienteController],
  providers: [
    clientServices,
    {
      provide: 'CLIENT_REPOSITORY',
      useClass: PrismaClientRepository,
    },
  ],
  exports: ['CLIENT_REPOSITORY'],
})
export class ClientModule {}
