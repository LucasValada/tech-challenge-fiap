import { OrdemServico } from './OrdemServico';
import { HistoricoStatusOSEntry } from './HistoricoStatusOSEntry';
import { OSServicoLinha } from './OSServicoLinha';
import { OSItemEstoqueLinha } from './OSItemEstoqueLinha';

describe('OrdemServico entity', () => {
  it('instancia com campos obrigatórios', () => {
    const os = new OrdemServico(
      'cliente-1',
      'veiculo-1',
      'usuario-1',
      'RECEBIDA',
      null,
      0,
      0,
      0,
    );

    expect(os.clienteId).toBe('cliente-1');
    expect(os.status).toBe('RECEBIDA');
    expect(os.observacoes).toBeNull();
    expect(os.valorTotal).toBe(0);
  });

  it('instancia com todos os campos opcionais', () => {
    const now = new Date();
    const os = new OrdemServico(
      'cliente-1',
      'veiculo-1',
      'usuario-1',
      'FINALIZADA',
      'Troca completa',
      200,
      100,
      300,
      'OS-2026-000001',
      'id-1',
      now,
      now,
      now,
      null,
    );

    expect(os.codigo).toBe('OS-2026-000001');
    expect(os.id).toBe('id-1');
    expect(os.finalizadaAt).toBe(now);
    expect(os.entregueAt).toBeNull();
  });
});

describe('HistoricoStatusOSEntry entity', () => {
  it('instancia com todos os campos', () => {
    const entry = new HistoricoStatusOSEntry(
      'ordem-1',
      'EM_DIAGNOSTICO',
      'usuario-1',
      'Iniciando diagnóstico',
      'hist-1',
      new Date(),
    );

    expect(entry.ordemServicoId).toBe('ordem-1');
    expect(entry.status).toBe('EM_DIAGNOSTICO');
    expect(entry.usuarioId).toBe('usuario-1');
    expect(entry.observacao).toBe('Iniciando diagnóstico');
  });
});

describe('OSServicoLinha entity', () => {
  it('instancia com todos os campos', () => {
    const linha = new OSServicoLinha(
      'ordem-1',
      'svc-1',
      'Troca de óleo',
      100,
      2,
      200,
      'linha-1',
      new Date(),
    );

    expect(linha.ordemServicoId).toBe('ordem-1');
    expect(linha.nomeSnapshot).toBe('Troca de óleo');
    expect(linha.subtotal).toBe(200);
  });
});

describe('OSItemEstoqueLinha entity', () => {
  it('instancia com todos os campos', () => {
    const linha = new OSItemEstoqueLinha(
      'ordem-1',
      'item-1',
      'Filtro de óleo',
      25.9,
      3,
      77.7,
      'linha-2',
      new Date(),
    );

    expect(linha.itemEstoqueId).toBe('item-1');
    expect(linha.quantidade).toBe(3);
    expect(linha.precoUnitario).toBe(25.9);
  });
});
