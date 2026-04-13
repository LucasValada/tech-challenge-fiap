import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateVeiculoDto } from "./create-veiculo.dto";

export class UpdateVeiculoDto extends PartialType(
  OmitType(CreateVeiculoDto, ["clienteId"] as const),
) {}
