import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import { EmailSender } from '../../../mail/domain/service/email-sender';
import {
  OSSemItensParaOrcamentoError,
  OSStatusInvalidoParaOrcamentoError,
} from '../../domain/errors';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';

@Injectable()
export class EnviarOrcamentoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
    @Inject('EMAIL_SENDER')
    private readonly emailSender: EmailSender,
  ) {}

  async execute(
    ordemId: string,
    usuarioId: string,
  ): Promise<OrdemServicoDetalhadaView> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );

    if (ordem.status !== 'EM_DIAGNOSTICO') {
      throw new ConflictException(
        new OSStatusInvalidoParaOrcamentoError(ordem.status).message,
      );
    }

    const { servicos, itens } =
      await this.ordemServicoRepository.contarLinhas(ordemId);
    if (servicos === 0 && itens === 0) {
      throw new UnprocessableEntityException(
        new OSSemItensParaOrcamentoError().message,
      );
    }

    await this.ordemServicoRepository.transicionarStatus(
      ordemId,
      'AGUARDANDO_APROVACAO',
      'AVANCO',
      usuarioId,
      'Orçamento enviado para aprovação do cliente',
    );

    const detalhes =
      await this.ordemServicoRepository.findByIdComDetalhes(ordemId);
    if (!detalhes) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    const cliente = await this.clienteRepository.getOne(detalhes.cliente.id);
    if (cliente?.email) {
      await this.emailSender.enviarOrcamento({
        clienteNome: detalhes.cliente.nome,
        clienteEmail: cliente.email,
        codigoOS: detalhes.codigo,
        placa: detalhes.veiculo.placa,
        servicos: detalhes.servicos.map((s) => ({
          nome: s.nomeSnapshot,
          quantidade: s.quantidade,
          subtotal: s.precoUnitario * s.quantidade,
        })),
        itens: detalhes.itens.map((i) => ({
          nome: i.nomeSnapshot,
          quantidade: i.quantidade,
          subtotal: i.precoUnitario * i.quantidade,
        })),
        valorServicos: detalhes.valorServicos,
        valorPecas: detalhes.valorPecas,
        valorTotal: detalhes.valorTotal,
      });
    }

    return detalhes;
  }
}
