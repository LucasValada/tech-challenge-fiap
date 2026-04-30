import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { generateOrdemServicoCodigo } from '../../domain/services/generateOrdemServicoCodigo';
import {
  CreateOrdemServicoDto,
  UpdateOrdemServicoDto,
} from '../dto/ordem-servico.dto';

@Injectable()
export class OrdemServicoService {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordemServicoRepository: OrdemServicoRepository,
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

  async create(
    usuarioCriadorId: string,
    dto: CreateOrdemServicoDto,
  ): Promise<OrdemServico> {
    const codigo = await this.gerarCodigoUnico();

    return this.ordemServicoRepository.create({
      codigo,
      clienteId: dto.clienteId,
      veiculoId: dto.veiculoId,
      usuarioCriadorId,
      observacoes: dto.observacoes ?? null,
    });
  }

  async update(id: string, dto: UpdateOrdemServicoDto): Promise<OrdemServico> {
    await this.findById(id);
    return this.ordemServicoRepository.update(id, {
      observacoes: dto.observacoes,
      status: dto.status,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.ordemServicoRepository.delete(id);
  }

  private async gerarCodigoUnico(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const codigo = generateOrdemServicoCodigo();
      const existente = await this.ordemServicoRepository.findByCodigo(codigo);
      if (!existente) {
        return codigo;
      }
    }
    throw new Error('Não foi possível gerar um código único para a OS');
  }
}
