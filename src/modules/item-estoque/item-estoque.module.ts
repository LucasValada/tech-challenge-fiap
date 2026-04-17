import { Module } from "@nestjs/common";
import { ItemEstoqueController } from "./item-estoque.controller";
import { ItemEstoqueRepository } from "./item-estoque.repository";
import { ItemEstoqueService } from "./item-estoque.service";

@Module({
  controllers: [ItemEstoqueController],
  providers: [ItemEstoqueService, ItemEstoqueRepository],
  exports: [ItemEstoqueService],
})
export class ItemEstoqueModule {}
