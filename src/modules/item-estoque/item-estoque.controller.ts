import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards";
import { CreateItemEstoqueDto, UpdateItemEstoqueDto } from "./dto";
import { ItemEstoqueService } from "./item-estoque.service";

@ApiTags("Itens de Estoque")
@UseGuards(JwtAuthGuard)
@Controller("itens-estoque")
export class ItemEstoqueController {
  constructor(private readonly itemEstoqueService: ItemEstoqueService) {}

  @Post()
  async create(@Body() dto: CreateItemEstoqueDto) {
    return this.itemEstoqueService.create(dto);
  }

  @Get()
  @ApiQuery({ name: "tipo", enum: ["PECA", "INSUMO"], required: false })
  async findAll(@Query("tipo") tipo?: "PECA" | "INSUMO") {
    return this.itemEstoqueService.findAll(tipo);
  }

  @Get("baixo-estoque")
  async findBaixoEstoque() {
    return this.itemEstoqueService.findBaixoEstoque();
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.itemEstoqueService.findById(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateItemEstoqueDto) {
    return this.itemEstoqueService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    await this.itemEstoqueService.delete(id);
  }
}
