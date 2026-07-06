import { Module } from '@nestjs/common';
import { ServicoController } from './interface/controller/servico.controller';
import { CreateServicoUseCase } from './application/use-case/create-servico.use-case';
import { GetAllServicosUseCase } from './application/use-case/get-all-servicos.use-case';
import { GetServicoByIdUseCase } from './application/use-case/get-servico-by-id.use-case';
import { UpdateServicoUseCase } from './application/use-case/update-servico.use-case';
import { DeleteServicoUseCase } from './application/use-case/delete-servico.use-case';
import { PrismaServicoRepository } from '../../infra/database/prisma/repositories/prisma.servico.repository';

@Module({
  controllers: [ServicoController],
  providers: [
    CreateServicoUseCase,
    GetAllServicosUseCase,
    GetServicoByIdUseCase,
    UpdateServicoUseCase,
    DeleteServicoUseCase,
    { provide: 'SERVICO_REPOSITORY', useClass: PrismaServicoRepository },
  ],
  exports: ['SERVICO_REPOSITORY'],
})
export class ServicoModule {}
