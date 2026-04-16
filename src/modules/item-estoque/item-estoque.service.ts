import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateItemEstoqueDto, UpdateItemEstoqueDto } from "./dto";
import { ItemEstoqueRepository } from "./item-estoque.repository";

@Injectable()
export class ItemEstoqueService {
  constructor(private readonly itemEstoqueRepository: ItemEstoqueRepository) {}

  async create(dto: CreateItemEstoqueDto) {
    const existente = await this.itemEstoqueRepository.findBySku(dto.sku);
    if (existente) {
      throw new ConflictException(`Item with SKU ${dto.sku} already exists`);
    }
    return this.itemEstoqueRepository.create(dto);
  }

  async findAll(tipo?: "PECA" | "INSUMO") {
    return this.itemEstoqueRepository.findAll(tipo);
  }

  async findById(id: string) {
    const item = await this.itemEstoqueRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Item with id ${id} not found`);
    }
    return item;
  }

  async findBaixoEstoque() {
    return this.itemEstoqueRepository.findBaixoEstoque();
  }

  async update(id: string, dto: UpdateItemEstoqueDto) {
    await this.findById(id);
    if (dto.sku) {
      const existente = await this.itemEstoqueRepository.findBySku(dto.sku);
      if (existente && existente.id !== id) {
        throw new ConflictException(`Item with SKU ${dto.sku} already exists`);
      }
    }
    return this.itemEstoqueRepository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.itemEstoqueRepository.delete(id);
  }
}
