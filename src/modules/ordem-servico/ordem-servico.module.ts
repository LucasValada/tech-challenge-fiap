import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientModule } from '../cliente/client.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { ServicoModule } from '../servico/servico.module';
import { ItemEstoqueModule } from '../item-estoque/item-estoque.module';
import { OrdemServicoService } from './application/use-case/ordem-servico.service';
import { PublicOrdemServicoService } from './application/use-case/public-ordem-servico.service';
import { RelatorioTempoMedioService } from './application/use-case/relatorio-tempo-medio.service';
import { ORDEM_SERVICO_REPOSITORY } from './domain/repository/ordem-servico.repository';
import { OrdemServicoController } from './interface/controller/ordem-servico.controller';
import { PublicOrdemServicoController } from './interface/controller/public-ordem-servico.controller';
import { RelatorioOrdemServicoController } from './interface/controller/relatorio-ordem-servico.controller';
import { PrismaOrdemServicoRepository } from '../../infra/database/prisma/repositories/prisma.ordem-servico.repository';

@Module({
  imports: [
    PrismaModule,
    ClientModule,
    VeiculoModule,
    ServicoModule,
    ItemEstoqueModule,
  ],
  controllers: [
    OrdemServicoController,
    PublicOrdemServicoController,
    RelatorioOrdemServicoController,
  ],
  providers: [
    OrdemServicoService,
    PublicOrdemServicoService,
    RelatorioTempoMedioService,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
