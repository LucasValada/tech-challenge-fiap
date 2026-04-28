import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { OSServicoLinha } from '../../domain/entity/OSServicoLinha';
import { OSItemEstoqueLinha } from '../../domain/entity/OSItemEstoqueLinha';
import { ClientRepository } from '../../../cliente/cliente.repository';
import { VeiculoRepository } from '../../../veiculo/veiculo.repository';
import { ServicoRepository } from '../../../servico/servico.repository';
import {
  ITEM_ESTOQUE_REPOSITORY,
  ItemEstoqueRepository,
} from '../../../item-estoque/domain/repository/item-estoque.repository';
import {
  ClienteNaoEncontradoError,
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  OSImutavelError,
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

@Injectable()
export class OrdemServicoService {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
    private readonly veiculoRepository: VeiculoRepository,
    private readonly servicoRepository: ServicoRepository,
    @Inject(ITEM_ESTOQUE_REPOSITORY)
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
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

    let cliente = await this.clientRepository.getByCpfCnpj(cpfCnpjNormalizado);
    if (!cliente && cpfCnpjNormalizado !== dto.cpfCnpj) {
      cliente = await this.clientRepository.getByCpfCnpj(dto.cpfCnpj);
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
        clienteId: cliente.id!,
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
    return this.ordemServicoRepository.transicionarStatus(
      ordemId,
      dto.status,
      resultado.tipo!,
      usuarioId,
      dto.observacao ?? null,
    );
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
