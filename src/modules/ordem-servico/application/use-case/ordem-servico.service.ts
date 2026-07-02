import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { OSServicoLinha } from '../../domain/entity/OSServicoLinha';
import { OSItemEstoqueLinha } from '../../domain/entity/OSItemEstoqueLinha';
import { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import {
  VEICULO_REPOSITORY,
  VeiculoRepository,
} from '../../../veiculo/domain/repository/veiculo.repository';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../../servico/domain/repository/servico.repository';
import { ItemEstoqueRepository } from '../../../item-estoque/domain/repository/item-estoque.repository';
import {
  ClienteNaoEncontradoError,
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  OSImutavelError,
  OSSemItensParaOrcamentoError,
  OSStatusInvalidoParaOrcamentoError,
  ServicoIndisponivelError,
  TransicaoInvalidaError,
  VeiculoNaoEncontradoError,
  VeiculoNaoPertenceAoClienteError,
} from '../../domain/errors';
import { classificarTransicao } from '../../domain/services/maquinaDeEstadosOS';
import { garantirOSMutavel } from '../../domain/services/garantirOSMutavel';
import {
  normalizarCpfCnpj,
  normalizarPlaca,
} from '../../domain/services/normalizadores';
import {
  CreateOrdemServicoDto,
  UpdateOrdemServicoDto,
} from '../dto/ordem-servico.dto';
import { AdicionarServicoOSDto } from '../dto/adicionar-servico-os.dto';
import { AdicionarItemEstoqueOSDto } from '../dto/adicionar-item-estoque-os.dto';
import { TransicionarStatusDto } from '../dto/transicionar-status.dto';
import { EmailSender } from '../../../mail/domain/service/email-sender';

@Injectable()
export class OrdemServicoService {
  private readonly logger = new Logger(OrdemServicoService.name);

  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculoRepository: VeiculoRepository,
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
    @Inject('EMAIL_SENDER')
    private readonly emailSender: EmailSender,
  ) {}

  async findAll(): Promise<{ ordens: OrdemServico[]; count: number }> {
    return this.ordemServicoRepository.findAll();
  }

  async findById(id: string): Promise<OrdemServico> {
    const ordem = await this.ordemServicoRepository.findById(id);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return ordem;
  }

  async findByIdComDetalhes(id: string): Promise<OrdemServicoDetalhadaView> {
    const ordem = await this.ordemServicoRepository.findByIdComDetalhes(id);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return ordem;
  }

  async create(
    usuarioCriadorId: string,
    dto: CreateOrdemServicoDto,
  ): Promise<OrdemServico> {
    const cpfCnpjNormalizado = normalizarCpfCnpj(dto.cpfCnpj);
    const placa = normalizarPlaca(dto.placa);

    let cliente = await this.clienteRepository.getByCpfCnpj(cpfCnpjNormalizado);
    if (!cliente && cpfCnpjNormalizado !== dto.cpfCnpj) {
      cliente = await this.clienteRepository.getByCpfCnpj(dto.cpfCnpj);
    }
    if (!cliente) {
      throw new NotFoundException(
        new ClienteNaoEncontradoError(dto.cpfCnpj).message,
      );
    }

    const veiculo = await this.veiculoRepository.findByPlaca(placa);
    if (!veiculo) {
      throw new NotFoundException(
        new VeiculoNaoEncontradoError(dto.placa).message,
      );
    }

    if (veiculo.clienteId !== cliente.id) {
      throw new UnprocessableEntityException(
        new VeiculoNaoPertenceAoClienteError(dto.placa, dto.cpfCnpj).message,
      );
    }

    try {
      return await this.ordemServicoRepository.createComItens({
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        usuarioCriadorId,
        observacoes: dto.observacoes ?? null,
        servicos: dto.servicos ?? [],
        itens: dto.itens ?? [],
      });
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async update(id: string, dto: UpdateOrdemServicoDto): Promise<OrdemServico> {
    await this.findById(id);
    return this.ordemServicoRepository.update(id, {
      observacoes: dto.observacoes,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.ordemServicoRepository.delete(id);
  }

  async adicionarServico(
    ordemId: string,
    dto: AdicionarServicoOSDto,
  ): Promise<OSServicoLinha> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.adicionarServico(ordemId, dto);
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async removerServico(ordemId: string, linhaId: string): Promise<void> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      await this.ordemServicoRepository.removerServico(ordemId, linhaId);
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async atualizarQuantidadeServico(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSServicoLinha> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.atualizarQuantidadeServico(
        ordemId,
        linhaId,
        quantidade,
      );
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async adicionarItemEstoque(
    ordemId: string,
    dto: AdicionarItemEstoqueOSDto,
  ): Promise<OSItemEstoqueLinha> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.adicionarItemEstoque(
        ordemId,
        dto,
      );
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async removerItemEstoque(ordemId: string, linhaId: string): Promise<void> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      await this.ordemServicoRepository.removerItemEstoque(ordemId, linhaId);
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async atualizarQuantidadeItemEstoque(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSItemEstoqueLinha> {
    const ordem = await this.findById(ordemId);
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.atualizarQuantidadeItemEstoque(
        ordemId,
        linhaId,
        quantidade,
      );
    } catch (e) {
      throw this.traduzirErroDominio(e);
    }
  }

  async transicionarStatus(
    ordemId: string,
    usuarioId: string,
    dto: TransicionarStatusDto,
  ): Promise<OrdemServico> {
    const ordem = await this.findById(ordemId);
    const resultado = classificarTransicao(ordem.status, dto.status);
    if (!resultado.valida) {
      throw new ConflictException(resultado.motivo);
    }
    const atualizada = await this.ordemServicoRepository.transicionarStatus(
      ordemId,
      dto.status,
      resultado.tipo!,
      usuarioId,
      dto.observacao ?? null,
    );

    await this.dispararNotificacaoStatus(ordemId, dto.status);

    return atualizada;
  }

  private async dispararNotificacaoStatus(
    ordemId: string,
    novoStatus: StatusOrdemServico,
  ): Promise<void> {
    if (novoStatus !== 'FINALIZADA' && novoStatus !== 'ENTREGUE') return;

    try {
      const detalhes = await this.findByIdComDetalhes(ordemId);
      const cliente = await this.clienteRepository.getOne(detalhes.cliente.id);
      if (!cliente?.email) return;

      const payload = {
        clienteNome: detalhes.cliente.nome,
        clienteEmail: cliente.email,
        codigoOS: detalhes.codigo,
        placa: detalhes.veiculo.placa,
      };

      if (novoStatus === 'FINALIZADA') {
        await this.emailSender.enviarNotificacaoFinalizacao(payload);
      } else {
        await this.emailSender.enviarNotificacaoEntrega(payload);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao notificar transição para ${novoStatus} (OS: ${ordemId}): ${String(error)}`,
      );
    }
  }

  async enviarOrcamento(
    ordemId: string,
    usuarioId: string,
  ): Promise<OrdemServicoDetalhadaView> {
    const ordem = await this.findById(ordemId);

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

    const detalhes = await this.findByIdComDetalhes(ordemId);

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

  private traduzirErroDominio(e: unknown): Error {
    if (e instanceof ClienteNaoEncontradoError) {
      return new NotFoundException(e.message);
    }
    if (e instanceof VeiculoNaoEncontradoError) {
      return new NotFoundException(e.message);
    }
    if (e instanceof VeiculoNaoPertenceAoClienteError) {
      return new UnprocessableEntityException(e.message);
    }
    if (
      e instanceof ServicoIndisponivelError ||
      e instanceof ItemEstoqueIndisponivelError ||
      e instanceof EstoqueInsuficienteError
    ) {
      return new UnprocessableEntityException(e.message);
    }
    if (e instanceof LinhaNaoEncontradaError) {
      return new NotFoundException(e.message);
    }
    if (e instanceof OSImutavelError || e instanceof TransicaoInvalidaError) {
      return new ConflictException(e.message);
    }
    return e instanceof Error ? e : new Error(String(e));
  }
}
