import {
  criarEnvelope,
  type Envelope,
} from '../../../../common/mensageria/envelope';
import type { OrdemServico } from '../../domain/entity/OrdemServico';
import type {
  OrdemServicoDetalhadaView,
  SnapshotOrcamento,
} from '../../domain/repository/ordem-servico.repository';
import { calcularTotais } from '../../domain/services/calcularTotaisOS';
import { COMANDOS } from './mensagens-saga';

/**
 * Montagem dos comandos que o OS publica, com os payloads de
 * docs/contratos.md (seção 5). Todo comando leva o id e o correlationId da OS,
 * que o Billing e o Execution devolvem nas respostas.
 */

export interface VeiculoDoComando {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

/** Na abertura da OS: põe o diagnóstico na fila do mecânico. */
export function iniciarDiagnostico(
  ordem: OrdemServico,
  veiculo: VeiculoDoComando,
): Envelope<unknown> {
  return comando(ordem, COMANDOS.iniciarDiagnostico, {
    codigo: ordem.codigo,
    veiculo: dadosDoVeiculo(veiculo),
    observacoes: ordem.observacoes,
  });
}

/**
 * No diagnóstico concluído: pede o orçamento ao Billing com a cópia das linhas
 * travadas. Os totais saem das próprias linhas, como o Billing confere.
 */
export function gerarOrcamento(snapshot: SnapshotOrcamento): Envelope<unknown> {
  const { valorServicos, valorPecas, valorTotal } = calcularTotais(
    snapshot.servicos,
    snapshot.itens,
  );
  return comando(snapshot.ordem, COMANDOS.gerarOrcamento, {
    codigo: snapshot.ordem.codigo,
    cliente: snapshot.cliente,
    servicos: snapshot.servicos,
    itens: snapshot.itens,
    valorServicos,
    valorPecas,
    valorTotal,
  });
}

/** No pagamento confirmado: põe o reparo na fila do mecânico. */
export function iniciarReparo(
  ordem: OrdemServico,
  detalhes: OrdemServicoDetalhadaView,
): Envelope<unknown> {
  return comando(ordem, COMANDOS.iniciarReparo, {
    codigo: detalhes.codigo,
    veiculo: dadosDoVeiculo(detalhes.veiculo),
    servicos: detalhes.servicos.map((s) => ({
      nome: s.nomeSnapshot,
      quantidade: s.quantidade,
    })),
    itens: detalhes.itens.map((i) => ({
      nome: i.nomeSnapshot,
      quantidade: i.quantidade,
    })),
  });
}

/** Compensação: cancela o orçamento e expira o link (ou estorna, se já pago). */
export function cancelarOrcamento(
  ordem: OrdemServico,
  motivo: string,
): Envelope<unknown> {
  return comando(ordem, COMANDOS.cancelarOrcamento, { motivo });
}

/** Compensação: estorna o pagamento de uma OS cujo reparo falhou. */
export function estornarPagamento(
  ordem: OrdemServico,
  motivo: string,
): Envelope<unknown> {
  return comando(ordem, COMANDOS.estornarPagamento, { motivo });
}

function dadosDoVeiculo(veiculo: VeiculoDoComando): VeiculoDoComando {
  return {
    placa: veiculo.placa,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
  };
}

function comando(
  ordem: OrdemServico,
  tipo: string,
  payload: Record<string, unknown>,
): Envelope<unknown> {
  if (!ordem.id || !ordem.correlationId) {
    // Só uma OS gravada participa da Saga: o id e o fluxo saem do banco.
    throw new Error(`OS sem id ou correlationId não pode publicar ${tipo}`);
  }
  return criarEnvelope(tipo, ordem.id, ordem.correlationId, payload);
}
