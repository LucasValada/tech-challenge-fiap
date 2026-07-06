import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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

/**
 * Converte erros de domínio da OS nas exceções HTTP correspondentes do Nest.
 * Erros desconhecidos são repassados como Error genérico.
 */
export function traduzirErroDominio(e: unknown): Error {
  if (e instanceof ClienteNaoEncontradoError) {
    return new NotFoundException(e.message);
  }
  if (e instanceof VeiculoNaoEncontradoError) {
    return new NotFoundException(e.message);
  }
  if (e instanceof VeiculoNaoPertenceAoClienteError) {
    return new UnprocessableEntityException(e.message);
  }
  if (
    e instanceof ServicoIndisponivelError ||
    e instanceof ItemEstoqueIndisponivelError ||
    e instanceof EstoqueInsuficienteError
  ) {
    return new UnprocessableEntityException(e.message);
  }
  if (e instanceof LinhaNaoEncontradaError) {
    return new NotFoundException(e.message);
  }
  if (e instanceof OSImutavelError || e instanceof TransicaoInvalidaError) {
    return new ConflictException(e.message);
  }
  return e instanceof Error ? e : new Error(String(e));
}
