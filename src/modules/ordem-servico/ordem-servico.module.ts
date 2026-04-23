import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdemServicoService } from './application/use-case/ordem-servico.service';
import { ORDEM_SERVICO_REPOSITORY } from './domain/repository/ordem-servico.repository';
import { OrdemServicoController } from './interface/controller/ordem-servico.controller';
import { PrismaOrdemServicoRepository } from '../../infra/database/prisma/repositories/prisma.ordem-servico.repository';

@Module({
  imports: [PrismaModule],
  controllers: [OrdemServicoController],
  providers: [
    OrdemServicoService,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
