import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSServicoLinha } from '../../domain/entity/OSServicoLinha';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirLinhasEditaveis } from '../../domain/services/garantirLinhasEditaveis';
import { AdicionarServicoOSDto } from '../dto/adicionar-servico-os.dto';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class AdicionarServicoOSUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    ordemId: string,
    dto: AdicionarServicoOSDto,
  ): Promise<OSServicoLinha> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    try {
      garantirLinhasEditaveis(ordem);
      return await this.ordemServicoRepository.adicionarServico(ordemId, dto);
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
