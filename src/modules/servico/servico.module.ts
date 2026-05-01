import { Module } from '@nestjs/common';
import { ServicoController } from './interface/controller/servico.controller';
import { ServicoService } from './application/use-case/servico.service';
import { SERVICO_REPOSITORY } from './domain/repository/servico.repository';
import { PrismaServicoRepository } from '../../infra/database/prisma/repositories/prisma.servico.repository';

@Module({
  controllers: [ServicoController],
  providers: [
    ServicoService,
    { provide: SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
  ],
  exports: [ServicoService, SERVICO_REPOSITORY],
})
export class ServicoModule {}
