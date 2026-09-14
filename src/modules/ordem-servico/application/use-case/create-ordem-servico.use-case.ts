import {
  HttpException,
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
import {
  registrarFalhaOrdemServico,
  registrarOrdemCriada,
  registrarRejeicaoOrdemServico,
} from '../shared/telemetria-ordem-servico';

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

    let cliente =
      await this.clienteRepository.findByCpfCnpj(cpfCnpjNormalizado);
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

    let ordem: OrdemServico;

    try {
      ordem = await this.ordemServicoRepository.createComItens({
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        usuarioCriadorId,
        observacoes: dto.observacoes ?? null,
        servicos: dto.servicos ?? [],
        itens: dto.itens ?? [],
      });
    } catch (e) {
      const traduzido = traduzirErroDominio(e);
      const contexto = { cliente_id: cliente.id, veiculo_id: veiculo.id };

      // O repositório também lança erro de domínio (estoque insuficiente,
      // serviço inativo), que vira 4xx: é a oficina recusando o pedido, não o
      // sistema falhando. Só o que não tem tradução — banco fora, bug — conta
      // como falha e alimenta o alerta. Contar os dois juntos faria cada peça
      // em falta abrir incidente.
      if (traduzido instanceof HttpException) {
        registrarRejeicaoOrdemServico('criacao', e, contexto);
      } else {
        registrarFalhaOrdemServico('criacao', e, contexto);
      }

      throw traduzido;
    }

    registrarOrdemCriada({
      ordemId: ordem.id,
      codigo: ordem.codigo,
      clienteId: cliente.id,
      veiculoId: veiculo.id,
      quantidadeServicos: dto.servicos?.length ?? 0,
      quantidadeItens: dto.itens?.length ?? 0,
    });

    return ordem;
  }
}
