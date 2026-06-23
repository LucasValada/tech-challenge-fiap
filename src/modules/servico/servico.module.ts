import { Module } from '@nestjs/common';
import { ServicoController } from './interface/controller/servico.controller';
import { SERVICO_REPOSITORY } from './domain/repository/servico.repository';
import { PrismaServicoRepository } from '../../infra/database/prisma/repositories/prisma.servico.repository';
import { CreateServicoUseCase } from './application/use-case/createServico.use-case';
import { DeleteServicoUseCase } from './application/use-case/deleteServico.use-case';
import { FindAllServicoUseCase } from './application/use-case/findAllServico.use-case';
import { FindByIdServicoUseCase } from './application/use-case/findByIdServico.use-case';
import { UpdateServicoUseCase } from './application/use-case/updateServico.use-case';

@Module({
  controllers: [ServicoController],
  providers: [
    CreateServicoUseCase,
    DeleteServicoUseCase,
    FindAllServicoUseCase,
    FindByIdServicoUseCase,
    UpdateServicoUseCase,
    { provide: SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
  ],
  exports: [SERVICO_REPOSITORY],
})
export class ServicoModule {}
