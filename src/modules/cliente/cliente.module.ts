import { Module } from '@nestjs/common';
import { ClienteController } from './interface/cliente.controller';
import { PrismaClienteRepository } from '../../infra/database/prisma/repositories/prisma.cliente.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateClienteUseCase } from './application/use-case/createCliente.use-case';
import { DeleteClienteUseCase } from './application/use-case/deleteCliente.use-case';
import { GetAllClienteUseCase } from './application/use-case/getAllCliente.use-case';
import { GetOneClienteUseCase } from './application/use-case/getOneCliente.use-case';
import { UpdateClienteUseCase } from './application/use-case/updateCliente.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ClienteController],
  providers: [
    CreateClienteUseCase,
    DeleteClienteUseCase,
    GetAllClienteUseCase,
    GetOneClienteUseCase,
    UpdateClienteUseCase,
    {
      provide: 'CLIENTE_REPOSITORY',
      useClass: PrismaClienteRepository,
    },
  ],
  exports: ['CLIENTE_REPOSITORY'],
})
export class ClienteModule {}
