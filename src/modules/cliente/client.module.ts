import { Module } from '@nestjs/common';
import { ClienteController } from './interface/cliente.controller';
import { PrismaClientRepository } from '../../infra/database/prisma/repositories/prisma.client.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateClienteUseCase } from './application/use-case/createCliente.use-case';
import { DeleteClientUseCase } from './application/use-case/deleteCliente.use-case';
import { GetAllClientServices } from './application/use-case/getAllCliente.use-case';
import { GetOneClienteUseCase } from './application/use-case/getOnecliente.use-case';
import { UpdateClienteUseCase } from './application/use-case/updateCliente.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ClienteController],
  providers: [
    CreateClienteUseCase,
    DeleteClientUseCase,
    GetAllClientServices,
    GetOneClienteUseCase,
    UpdateClienteUseCase,
    {
      provide: 'CLIENT_REPOSITORY',
      useClass: PrismaClientRepository,
    },
  ],
  exports: ['CLIENT_REPOSITORY'],
})
export class ClientModule {}
