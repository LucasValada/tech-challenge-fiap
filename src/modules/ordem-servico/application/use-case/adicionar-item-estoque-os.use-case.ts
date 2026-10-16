import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSItemEstoqueLinha } from '../../domain/entity/OSItemEstoqueLinha';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirLinhasEditaveis } from '../../domain/services/garantirLinhasEditaveis';
import { AdicionarItemEstoqueOSDto } from '../dto/adicionar-item-estoque-os.dto';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class AdicionarItemEstoqueOSUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    ordemId: string,
    dto: AdicionarItemEstoqueOSDto,
  ): Promise<OSItemEstoqueLinha> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    try {
      garantirLinhasEditaveis(ordem);
      return await this.ordemServicoRepository.adicionarItemEstoque(
        ordemId,
        dto,
      );
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
