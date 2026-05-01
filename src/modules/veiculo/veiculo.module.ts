import { Module } from '@nestjs/common';
import { VeiculoController } from './interface/controller/veiculo.controller';
import { VeiculoService } from './application/use-case/veiculo.service';
import { VEICULO_REPOSITORY } from './domain/repository/veiculo.repository';
import { PrismaVeiculoRepository } from '../../infra/database/prisma/repositories/prisma.veiculo.repository';

@Module({
  controllers: [VeiculoController],
  providers: [
    VeiculoService,
    { provide: VEICULO_REPOSITORY, useClass: PrismaVeiculoRepository },
  ],
  exports: [VeiculoService, VEICULO_REPOSITORY],
})
export class VeiculoModule {}
