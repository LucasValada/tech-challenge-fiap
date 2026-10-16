/**
 * E-mails que o OS envia: finalização e entrega. O orçamento e o link de
 * pagamento são enviados pelo Billing, que é o dono deles.
 */
export interface NotificacaoStatusEmailData {
  clienteNome: string;
  clienteEmail: string;
  codigoOS: string;
  placa: string;
}

export interface EmailSender {
  enviarNotificacaoFinalizacao(data: NotificacaoStatusEmailData): Promise<void>;
  enviarNotificacaoEntrega(data: NotificacaoStatusEmailData): Promise<void>;
}
