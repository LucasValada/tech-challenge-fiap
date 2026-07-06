import { NotFoundException } from '@nestjs/common';
import { OrdemServico } from '../entity/OrdemServico';
import { OrdemServicoRepository } from '../repository/ordem-servico.repository';

export async function buscarOrdemServicoOuFalhar(
  ordemServicoRepository: OrdemServicoRepository,
  id: string,
): Promise<OrdemServico> {
  const ordem = await ordemServicoRepository.findById(id);
  if (!ordem) {
    throw new NotFoundException('Ordem de serviço não encontrada');
  }
  return ordem;
}
