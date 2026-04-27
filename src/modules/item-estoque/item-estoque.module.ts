import { Module } from '@nestjs/common';
import { ItemEstoqueController } from './interface/controller/item-estoque.controller';
import { ItemEstoqueService } from './application/use-case/item-estoque.service';
import { ITEM_ESTOQUE_REPOSITORY } from './domain/repository/item-estoque.repository';
import { PrismaItemEstoqueRepository } from '../../infra/database/prisma/repositories/prisma.item-estoque.repository';

@Module({
  controllers: [ItemEstoqueController],
  providers: [
    ItemEstoqueService,
    { provide: ITEM_ESTOQUE_REPOSITORY, useClass: PrismaItemEstoqueRepository },
  ],
  exports: [ItemEstoqueService],
})
export class ItemEstoqueModule {}
