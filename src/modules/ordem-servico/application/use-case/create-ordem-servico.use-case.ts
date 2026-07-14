import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { ClienteRepository } from '../../../cliente/domain/repository/cliente.repository';
import { VeiculoRepository } from '../../../veiculo/domain/repository/veiculo.repository';
import {
  ClienteNaoEncontradoError,
  VeiculoNaoEncontradoError,
  VeiculoNaoPertenceAoClienteError,
} from '../../domain/errors';
import {
  normalizarCpfCnpj,
  normalizarPlaca,
} from '../../domain/services/normalizadores';
import { CreateOrdemServicoDto } from '../dto/ordem-servico.dto';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class CreateOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async execute(
    usuarioCriadorId: string,
    dto: CreateOrdemServicoDto,
  ): Promise<OrdemServico> {
    const cpfCnpjNormalizado = normalizarCpfCnpj(dto.cpfCnpj);
    const placa = normalizarPlaca(dto.placa);

    let cliente = await this.clienteRepository.findByCpfCnpj(
      cpfCnpjNormalizado,
    );
    if (!cliente && cpfCnpjNormalizado !== dto.cpfCnpj) {
      cliente = await this.clienteRepository.findByCpfCnpj(dto.cpfCnpj);
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
      throw traduzirErroDominio(e);
    }
  }
}
