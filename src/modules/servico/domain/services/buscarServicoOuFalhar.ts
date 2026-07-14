import { NotFoundException } from '@nestjs/common';
import { Servico } from '../entity/Servico';
import { ServicoRepository } from '../repository/servico.repository';

export async function buscarServicoOuFalhar(
  servicoRepository: ServicoRepository,
  id: string,
): Promise<Servico> {
  const servico = await servicoRepository.findById(id);
  if (!servico) {
    throw new NotFoundException('Serviço não encontrado');
  }
  return servico;
}
