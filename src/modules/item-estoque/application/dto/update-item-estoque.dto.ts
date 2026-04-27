import { PartialType } from '@nestjs/swagger';
import { CreateItemEstoqueDto } from './create-item-estoque.dto';

export class UpdateItemEstoqueDto extends PartialType(CreateItemEstoqueDto) {}
