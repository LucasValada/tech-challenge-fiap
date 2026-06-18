import { randomUUID } from 'node:crypto';
import { E2eContext, authRequest } from '../setup-e2e';

export interface ClienteFixtureDto {
  nome: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';
}

export interface RecursosE2e {
  osIds?: string[];
  itemEstoqueIds?: string[];
  servicoIds?: string[];
  veiculoIds?: string[];
  clienteId?: string;
}

export async function criarClienteFixture(
  ctx: E2eContext,
  dto: ClienteFixtureDto,
): Promise<string> {
  const res = await authRequest(ctx, 'post', '/cliente').send(dto);
  return res.body.id as string;
}

export async function criarVeiculoFixture(
  ctx: E2eContext,
  clienteId: string,
  placa: string,
  overrides: { marca?: string; modelo?: string; ano?: number } = {},
): Promise<string> {
  const res = await authRequest(ctx, 'post', '/veiculos').send({
    placa,
    marca: overrides.marca ?? 'Fiat',
    modelo: overrides.modelo ?? 'Uno',
    ano: overrides.ano ?? 2020,
    clienteId,
  });
  return res.body.id as string;
}

export async function criarServicoFixture(
  ctx: E2eContext,
  prefixo: string,
  overrides: { precoBase?: number; tempoEstimadoMin?: number } = {},
): Promise<string> {
  const res = await authRequest(ctx, 'post', '/servicos').send({
    nome: `${prefixo} ${randomUUID()}`,
    precoBase: overrides.precoBase ?? 100,
    tempoEstimadoMin: overrides.tempoEstimadoMin ?? 30,
  });
  return res.body.id as string;
}

export async function criarOS(
  ctx: E2eContext,
  cpfCnpj: string,
  placa: string,
): Promise<{ id: string; codigo: string }> {
  const res = await authRequest(ctx, 'post', '/ordens-servico')
    .send({ cpfCnpj, placa })
    .expect(201);
  return { id: res.body.id as string, codigo: res.body.codigo as string };
}

export async function transicionarStatus(
  ctx: E2eContext,
  osId: string,
  status: string,
): Promise<void> {
  await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
    .send({ status })
    .expect(200);
}

export async function adicionarServicoNaOS(
  ctx: E2eContext,
  osId: string,
  servicoId: string,
  quantidade = 1,
): Promise<void> {
  await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
    .send({ servicoId, quantidade })
    .expect(201);
}

export async function limparRecursos(
  ctx: E2eContext,
  recursos: RecursosE2e,
): Promise<void> {
  for (const id of recursos.osIds ?? []) {
    await authRequest(ctx, 'delete', `/ordens-servico/${id}`);
  }
  for (const id of recursos.itemEstoqueIds ?? []) {
    await authRequest(ctx, 'delete', `/itens-estoque/${id}`);
  }
  for (const id of recursos.servicoIds ?? []) {
    await authRequest(ctx, 'delete', `/servicos/${id}`);
  }
  for (const id of recursos.veiculoIds ?? []) {
    await authRequest(ctx, 'delete', `/veiculos/${id}`);
  }
  if (recursos.clienteId) {
    await authRequest(ctx, 'delete', `/cliente/delete/${recursos.clienteId}`);
  }
}
