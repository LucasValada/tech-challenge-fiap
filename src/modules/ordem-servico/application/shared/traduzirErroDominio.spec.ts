import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { traduzirErroDominio } from './traduzirErroDominio';
import {
  ClienteNaoEncontradoError,
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  OSImutavelError,
  ServicoIndisponivelError,
  TransicaoInvalidaError,
  VeiculoNaoEncontradoError,
  VeiculoNaoPertenceAoClienteError,
} from '../../domain/errors';

describe('traduzirErroDominio', () => {
  const cenarios: Array<{
    nome: string;
    erro: Error;
    esperado: new (...args: any[]) => Error;
  }> = [
    {
      nome: 'ClienteNaoEncontradoError → 404',
      erro: new ClienteNaoEncontradoError('52998224725'),
      esperado: NotFoundException,
    },
    {
      nome: 'VeiculoNaoEncontradoError → 404',
      erro: new VeiculoNaoEncontradoError('ABC1D23'),
      esperado: NotFoundException,
    },
    {
      nome: 'VeiculoNaoPertenceAoClienteError → 422',
      erro: new VeiculoNaoPertenceAoClienteError('ABC1D23', '52998224725'),
      esperado: UnprocessableEntityException,
    },
    {
      nome: 'ServicoIndisponivelError → 422',
      erro: new ServicoIndisponivelError('svc-x'),
      esperado: UnprocessableEntityException,
    },
    {
      nome: 'ItemEstoqueIndisponivelError → 422',
      erro: new ItemEstoqueIndisponivelError('item-x'),
      esperado: UnprocessableEntityException,
    },
    {
      nome: 'EstoqueInsuficienteError → 422',
      erro: new EstoqueInsuficienteError('Pastilha', 1, 5),
      esperado: UnprocessableEntityException,
    },
    {
      nome: 'LinhaNaoEncontradaError → 404',
      erro: new LinhaNaoEncontradaError('linha-x'),
      esperado: NotFoundException,
    },
    {
      nome: 'OSImutavelError → 409',
      erro: new OSImutavelError('FINALIZADA'),
      esperado: ConflictException,
    },
    {
      nome: 'TransicaoInvalidaError → 409',
      erro: new TransicaoInvalidaError('RECEBIDA', 'ENTREGUE'),
      esperado: ConflictException,
    },
  ];

  for (const c of cenarios) {
    it(`mapeia ${c.nome}`, () => {
      expect(traduzirErroDominio(c.erro)).toBeInstanceOf(c.esperado);
    });
  }

  it('repassa Error genérico como está', () => {
    const erro = new Error('boom');
    expect(traduzirErroDominio(erro)).toBe(erro);
  });

  it('embrulha valores não-Error em Error genérico', () => {
    const result = traduzirErroDominio('string error');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('string error');
  });
});
