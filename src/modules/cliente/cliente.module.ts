import { Module } from '@nestjs/common';
import { ClienteController } from './interface/controller/cliente.controller';
import { PrismaClienteRepository } from '../../infra/database/prisma/repositories/prisma.cliente.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateClienteUseCase } from './application/use-case/create-cliente.use-case';
import { GetAllClientesUseCase } from './application/use-case/get-all-clientes.use-case';
import { GetClienteByIdUseCase } from './application/use-case/get-cliente-by-id.use-case';
import { UpdateClienteUseCase } from './application/use-case/update-cliente.use-case';
import { DeleteClienteUseCase } from './application/use-case/delete-cliente.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ClienteController],
  providers: [
    CreateClienteUseCase,
    GetAllClientesUseCase,
    GetClienteByIdUseCase,
    UpdateClienteUseCase,
    DeleteClienteUseCase,
    { provide: 'CLIENTE_REPOSITORY', useClass: PrismaClienteRepository },
  ],
  exports: ['CLIENTE_REPOSITORY'],
})
export class ClienteModule {}
