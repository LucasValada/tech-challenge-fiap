import { NotificadorStatusOS } from './notificador-status-os';
import type { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import type { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import type { EmailSender } from '../../../mail/domain/service/email-sender';

describe('NotificadorStatusOS', () => {
  const ordemRepo = { findByIdComDetalhes: jest.fn() };
  const clienteRepo = { findById: jest.fn() };
  const emailSender = {
    enviarNotificacaoFinalizacao: jest.fn(),
    enviarNotificacaoEntrega: jest.fn(),
  };
  const notificador = new NotificadorStatusOS(
    ordemRepo as unknown as OrdemServicoRepository,
    clienteRepo as unknown as ClienteRepository,
    emailSender as unknown as EmailSender,
  );

  const detalhes = {
    codigo: 'OS-2026-000001',
    cliente: { id: 'cliente-1', nome: 'João' },
    veiculo: { placa: 'ABC1D23' },
  };
  const esperado = {
    clienteNome: 'João',
    clienteEmail: 'joao@email.com',
    codigoOS: 'OS-2026-000001',
    placa: 'ABC1D23',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ordemRepo.findByIdComDetalhes.mockResolvedValue(detalhes);
    clienteRepo.findById.mockResolvedValue({ email: 'joao@email.com' });
  });

  it('avisa a finalização', async () => {
    await notificador.notificar('ordem-1', 'FINALIZADA');

    expect(emailSender.enviarNotificacaoFinalizacao).toHaveBeenCalledWith(
      esperado,
    );
    expect(emailSender.enviarNotificacaoEntrega).not.toHaveBeenCalled();
  });

  it('avisa a entrega', async () => {
    await notificador.notificar('ordem-1', 'ENTREGUE');

    expect(emailSender.enviarNotificacaoEntrega).toHaveBeenCalledWith(esperado);
  });

  it('cliente sem e-mail: nada é enviado', async () => {
    clienteRepo.findById.mockResolvedValue({ email: null });

    await notificador.notificar('ordem-1', 'FINALIZADA');

    expect(emailSender.enviarNotificacaoFinalizacao).not.toHaveBeenCalled();
  });

  it('OS não encontrada: nada é enviado', async () => {
    ordemRepo.findByIdComDetalhes.mockResolvedValue(null);

    await notificador.notificar('ordem-1', 'FINALIZADA');

    expect(clienteRepo.findById).not.toHaveBeenCalled();
  });

  it('falha no envio não interrompe quem chamou (best-effort)', async () => {
    emailSender.enviarNotificacaoFinalizacao.mockRejectedValue(
      new Error('Lambda fora'),
    );

    await expect(
      notificador.notificar('ordem-1', 'FINALIZADA'),
    ).resolves.toBeUndefined();
  });
});
