import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from "class-validator";

export class CreateVeiculoDto {
  @ApiProperty({
    example: "ABC1D23",
    description: "Brazilian license plate (Mercosul ABC1D23 or legacy ABC1234)",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.replace(/-/g, "").toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, {
    message:
      "placa must be a valid Brazilian license plate (e.g., ABC1D23 or ABC1234)",
  })
  placa!: string;

  @ApiProperty({ example: "Toyota" })
  @IsString()
  @IsNotEmpty()
  marca!: string;

  @ApiProperty({ example: "Corolla" })
  @IsString()
  @IsNotEmpty()
  modelo!: string;

  @ApiProperty({ example: 2023 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano!: number;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  @IsNotEmpty()
  clienteId!: string;
}
