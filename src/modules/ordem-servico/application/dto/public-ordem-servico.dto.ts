import { ApiProperty } from '@nestjs/swagger';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

const STATUS_VALUES: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
];

export class PublicOrdemServicoClienteDto {
  @ApiProperty({ description: 'Nome do cliente', example: 'João da Silva' })
  nome!: string;
}

export class PublicOrdemServicoVeiculoDto {
  @ApiProperty({ description: 'Placa do veículo', example: 'ABC1D23' })
  placa!: string;

  @ApiProperty({ description: 'Marca do veículo', example: 'Volkswagen' })
  marca!: string;

  @ApiProperty({ description: 'Modelo do veículo', example: 'Gol' })
  modelo!: string;

  @ApiProperty({ description: 'Ano do veículo', example: 2020 })
  ano!: number;
}

export class PublicOrdemServicoItemDto {
  @ApiProperty({
    description: 'Nome do serviço/peça no momento da inclusão na OS',
    example: 'Troca de óleo',
  })
  nomeSnapshot!: string;

  @ApiProperty({ description: 'Preço unitário', example: 150 })
  precoUnitario!: number;

  @ApiProperty({ description: 'Quantidade', example: 1 })
  quantidade!: number;

  @ApiProperty({ description: 'Subtotal', example: 150 })
  subtotal!: number;
}

export class PublicHistoricoStatusDto {
  @ApiProperty({
    description: 'Status registrado',
    enum: STATUS_VALUES,
    example: 'EM_DIAGNOSTICO',
  })
  status!: StatusOrdemServico;

  @ApiProperty({
    description: 'Observação registrada na transição',
    nullable: true,
    example: 'Veículo em análise pelo mecânico',
  })
  observacao!: string | null;

  @ApiProperty({
    description: 'Data/hora do registro',
    example: '2026-04-27T13:45:00.000Z',
  })
  createdAt!: Date;
}

export class PublicOrdemServicoResponseDto {
  @ApiProperty({ description: 'Código da OS', example: 'OS-20260427-A1B2C3' })
  codigo!: string;

  @ApiProperty({
    description: 'Status atual da OS',
    enum: STATUS_VALUES,
    example: 'EM_EXECUCAO',
  })
  status!: StatusOrdemServico;

  @ApiProperty({
    description: 'Observações da OS',
    nullable: true,
    example: 'Veículo chegou com barulho na suspensão',
  })
  observacoes!: string | null;

  @ApiProperty({ description: 'Valor total dos serviços', example: 450 })
  valorServicos!: number;

  @ApiProperty({ description: 'Valor total das peças', example: 320.5 })
  valorPecas!: number;

  @ApiProperty({ description: 'Valor total da OS', example: 770.5 })
  valorTotal!: number;

  @ApiProperty({
    description: 'Data de abertura da OS',
    example: '2026-04-27T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data de finalização do serviço',
    nullable: true,
    example: null,
  })
  finalizadaAt!: Date | null;

  @ApiProperty({
    description: 'Data de entrega ao cliente',
    nullable: true,
    example: null,
  })
  entregueAt!: Date | null;

  @ApiProperty({ type: PublicOrdemServicoClienteDto })
  cliente!: PublicOrdemServicoClienteDto;

  @ApiProperty({ type: PublicOrdemServicoVeiculoDto })
  veiculo!: PublicOrdemServicoVeiculoDto;

  @ApiProperty({ type: [PublicOrdemServicoItemDto] })
  servicos!: PublicOrdemServicoItemDto[];

  @ApiProperty({ type: [PublicOrdemServicoItemDto] })
  itens!: PublicOrdemServicoItemDto[];

  @ApiProperty({ type: [PublicHistoricoStatusDto] })
  historicoStatus!: PublicHistoricoStatusDto[];
}
