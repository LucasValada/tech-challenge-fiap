import { Module } from '@nestjs/common';
import { ItemEstoqueController } from './interface/controller/item-estoque.controller';
import { CreateItemEstoqueUseCase } from './application/use-case/create-item-estoque.use-case';
import { GetAllItensEstoqueUseCase } from './application/use-case/get-all-itens-estoque.use-case';
import { GetItemEstoqueByIdUseCase } from './application/use-case/get-item-estoque-by-id.use-case';
import { GetItensBaixoEstoqueUseCase } from './application/use-case/get-itens-baixo-estoque.use-case';
import { UpdateItemEstoqueUseCase } from './application/use-case/update-item-estoque.use-case';
import { DeleteItemEstoqueUseCase } from './application/use-case/delete-item-estoque.use-case';
import { PrismaItemEstoqueRepository } from '../../infra/database/prisma/repositories/prisma.item-estoque.repository';

@Module({
  controllers: [ItemEstoqueController],
  providers: [
    CreateItemEstoqueUseCase,
    GetAllItensEstoqueUseCase,
    GetItemEstoqueByIdUseCase,
    GetItensBaixoEstoqueUseCase,
    UpdateItemEstoqueUseCase,
    DeleteItemEstoqueUseCase,
    {
      provide: 'ITEM_ESTOQUE_REPOSITORY',
      useClass: PrismaItemEstoqueRepository,
    },
  ],
  exports: ['ITEM_ESTOQUE_REPOSITORY'],
})
export class ItemEstoqueModule {}
