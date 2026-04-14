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
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards";
import { CreateVeiculoDto, UpdateVeiculoDto } from "./dto";
import { VeiculoService } from "./veiculo.service";

@ApiTags("Veiculos")
@UseGuards(JwtAuthGuard)
@Controller("veiculos")
export class VeiculoController {
  constructor(private readonly veiculoService: VeiculoService) {}

  @Post()
  async create(@Body() dto: CreateVeiculoDto) {
    return this.veiculoService.create(dto);
  }

  @Get()
  async findAll() {
    return this.veiculoService.findAll();
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.veiculoService.findById(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateVeiculoDto) {
    return this.veiculoService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    await this.veiculoService.delete(id);
  }
}
