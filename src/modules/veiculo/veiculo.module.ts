import { Module } from '@nestjs/common';
import { VeiculoController } from './interface/controller/veiculo.controller';
import { CreateVeiculoUseCase } from './application/use-case/create-veiculo.use-case';
import { GetAllVeiculosUseCase } from './application/use-case/get-all-veiculos.use-case';
import { GetVeiculoByIdUseCase } from './application/use-case/get-veiculo-by-id.use-case';
import { UpdateVeiculoUseCase } from './application/use-case/update-veiculo.use-case';
import { DeleteVeiculoUseCase } from './application/use-case/delete-veiculo.use-case';
import { PrismaVeiculoRepository } from '../../infra/database/prisma/repositories/prisma.veiculo.repository';

@Module({
  controllers: [VeiculoController],
  providers: [
    CreateVeiculoUseCase,
    GetAllVeiculosUseCase,
    GetVeiculoByIdUseCase,
    UpdateVeiculoUseCase,
    DeleteVeiculoUseCase,
    { provide: 'VEICULO_REPOSITORY', useClass: PrismaVeiculoRepository },
  ],
  exports: ['VEICULO_REPOSITORY'],
})
export class VeiculoModule {}
