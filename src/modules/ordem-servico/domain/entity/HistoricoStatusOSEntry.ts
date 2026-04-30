import { StatusOrdemServico } from './OrdemServico';

export class HistoricoStatusOSEntry {
  constructor(
    public ordemServicoId: string,
    public status: StatusOrdemServico,
    public usuarioId: string,
    public observacao: string | null,
    public id?: string,
    public createdAt?: Date,
  ) {}
}
