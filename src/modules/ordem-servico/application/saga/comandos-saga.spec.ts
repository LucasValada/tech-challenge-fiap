import { OrdemServico } from '../../domain/entity/OrdemServico';
import {
  cancelarOrcamento,
  estornarPagamento,
  iniciarDiagnostico,
} from './comandos-saga';

function ordemGravada(): OrdemServico {
  const ordem = new OrdemServico(
    'cliente-1',
    'veiculo-1',
    'criador-1',
    'RECEBIDA',
    'Barulho no motor',
    0,
    0,
    0,
    'OS-2026-000001',
    'ordem-1',
  );
  ordem.correlationId = 'fluxo-da-os';
  return ordem;
}

describe('comandos da Saga', () => {
  it('todo comando leva o id e o correlationId da OS', () => {
    const envelope = cancelarOrcamento(ordemGravada(), 'Cliente desistiu');

    expect(envelope).toMatchObject({
      tipo: 'CancelarOrcamento',
      osId: 'ordem-1',
      correlationId: 'fluxo-da-os',
      payload: { motivo: 'Cliente desistiu' },
    });
    expect(envelope.messageId).toEqual(expect.any(String));
  });

  it('EstornarPagamento leva o motivo', () => {
    expect(
      estornarPagamento(ordemGravada(), 'Falha no reparo').payload,
    ).toEqual({ motivo: 'Falha no reparo' });
  });

  it('IniciarDiagnostico copia só os campos do veículo que o contrato pede', () => {
    const veiculo = {
      id: 'veiculo-1',
      clienteId: 'cliente-1',
      placa: 'ABC1D23',
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
    };

    expect(iniciarDiagnostico(ordemGravada(), veiculo).payload).toEqual({
      codigo: 'OS-2026-000001',
      veiculo: { placa: 'ABC1D23', marca: 'Fiat', modelo: 'Uno', ano: 2020 },
      observacoes: 'Barulho no motor',
    });
  });

  it('uma OS que não veio do banco (sem id ou correlationId) não publica', () => {
    const naoGravada = new OrdemServico(
      'c',
      'v',
      'u',
      'RECEBIDA',
      null,
      0,
      0,
      0,
    );

    expect(() => cancelarOrcamento(naoGravada, 'x')).toThrow(
      'OS sem id ou correlationId não pode publicar CancelarOrcamento',
    );
  });
});
