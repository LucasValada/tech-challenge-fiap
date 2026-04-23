export type StatusOrdemServico =
  | 'RECEBIDA'
  | 'EM_DIAGNOSTICO'
  | 'AGUARDANDO_APROVACAO'
  | 'EM_EXECUCAO'
  | 'FINALIZADA'
  | 'ENTREGUE';

export class OrdemServico {
  constructor(
    public clienteId: string,
    public veiculoId: string,
    public usuarioCriadorId: string,
    public status: StatusOrdemServico,
    public observacoes: string | null,
    public valorServicos: number,
    public valorPecas: number,
    public valorTotal: number,
    public codigo?: string,
    public id?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
    public finalizadaAt?: Date | null,
    public entregueAt?: Date | null,
  ) {}
}
