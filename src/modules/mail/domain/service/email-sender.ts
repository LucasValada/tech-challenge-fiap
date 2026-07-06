export interface OrcamentoEmailData {
  clienteNome: string;
  clienteEmail: string;
  codigoOS: string;
  placa: string;
  servicos: { nome: string; quantidade: number; subtotal: number }[];
  itens: { nome: string; quantidade: number; subtotal: number }[];
  valorServicos: number;
  valorPecas: number;
  valorTotal: number;
}

export interface NotificacaoStatusEmailData {
  clienteNome: string;
  clienteEmail: string;
  codigoOS: string;
  placa: string;
}

export interface EmailSender {
  enviarOrcamento(data: OrcamentoEmailData): Promise<void>;
  enviarNotificacaoFinalizacao(data: NotificacaoStatusEmailData): Promise<void>;
  enviarNotificacaoEntrega(data: NotificacaoStatusEmailData): Promise<void>;
}
