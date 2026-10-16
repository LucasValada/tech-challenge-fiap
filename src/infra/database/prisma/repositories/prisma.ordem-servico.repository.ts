import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../../../modules/ordem-servico/domain/entity/OrdemServico';
import { OSServicoLinha } from '../../../../modules/ordem-servico/domain/entity/OSServicoLinha';
import { OSItemEstoqueLinha } from '../../../../modules/ordem-servico/domain/entity/OSItemEstoqueLinha';
import {
  AdicionarItemEstoqueData,
  AdicionarServicoData,
  AntesDoCommit,
  CreateOrdemServicoComItensData,
  OpcoesTransicao,
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
  PublicOrdemServicoView,
  RelatorioTempoMedioFiltros,
  RelatorioTempoMedioView,
  SnapshotOrcamento,
  TempoMedioServicoView,
  TipoTransicaoOS,
  UpdateOrdemServicoData,
} from '../../../../modules/ordem-servico/domain/repository/ordem-servico.repository';
import { OrdemServicoModel } from '../../../../generated/prisma/models';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstoqueInsuficienteError,
  ItemEstoqueIndisponivelError,
  LinhaNaoEncontradaError,
  LinhasTravadasError,
  OrdemServicoAlteradaError,
  ServicoIndisponivelError,
} from '../../../../modules/ordem-servico/domain/errors';
import { calcularSubtotal } from '../../../../modules/ordem-servico/domain/services/calcularTotaisOS';
import { gerarCodigoOSSequencial } from '../../../../modules/ordem-servico/domain/services/gerarCodigoOSSequencial';
import { inicioDoStatusAtual } from '../../../../modules/ordem-servico/domain/services/inicioDoStatusAtual';
import {
  STATUS_EXCLUIDOS_DA_LISTAGEM,
  prioridadeStatusListagem,
} from '../../../../modules/ordem-servico/domain/services/prioridadeStatusOS';
import {
  registrarFalhaOrdemServico,
  registrarTransicaoDeStatus,
  segundosEntre,
} from '../../../../modules/ordem-servico/application/shared/telemetria-ordem-servico';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PrismaOrdemServicoRepository implements OrdemServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista as OS ativas (exclui FINALIZADA e ENTREGUE) ordenadas por prioridade
   * de status (EM_EXECUCAO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA)
   * e, dentro do mesmo status, as mais antigas primeiro (createdAt ASC).
   */
  async findAll(): Promise<{ ordens: OrdemServico[]; count: number }> {
    const ordens = await this.prisma.ordemServico.findMany({
      where: { status: { notIn: STATUS_EXCLUIDOS_DA_LISTAGEM } },
      orderBy: { createdAt: 'asc' },
    });

    const ordenadas = [...ordens].sort((a, b) => {
      const prioA = prioridadeStatusListagem(a.status as StatusOrdemServico);
      const prioB = prioridadeStatusListagem(b.status as StatusOrdemServico);
      if (prioA !== prioB) return prioA - prioB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      ordens: ordenadas.map((o) => this.toEntity(o)),
      count: ordenadas.length,
    };
  }

  /**
   * Lista todas as OS de um cliente (inclusive FINALIZADA e ENTREGUE, para o
   * cliente acompanhar o histórico completo), das mais recentes às mais antigas.
   */
  async findByClienteId(
    clienteId: string,
  ): Promise<{ ordens: OrdemServico[]; count: number }> {
    const ordens = await this.prisma.ordemServico.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ordens: ordens.map((o) => this.toEntity(o)),
      count: ordens.length,
    };
  }

  async findById(id: string): Promise<OrdemServico | null> {
    const ordem = await this.prisma.ordemServico.findUnique({ where: { id } });
    return ordem ? this.toEntity(ordem) : null;
  }

  async findByCodigo(codigo: string): Promise<OrdemServico | null> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { codigo },
    });
    return ordem ? this.toEntity(ordem) : null;
  }

  async findByIdComDetalhes(
    id: string,
  ): Promise<OrdemServicoDetalhadaView | null> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        veiculo: {
          select: {
            id: true,
            placa: true,
            marca: true,
            modelo: true,
            ano: true,
          },
        },
        usuarioCriador: { select: { id: true, nome: true } },
        osServicos: {
          select: {
            id: true,
            servicoId: true,
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        osItensEstoque: {
          select: {
            id: true,
            itemEstoqueId: true,
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        historicoStatus: {
          select: {
            status: true,
            observacao: true,
            createdAt: true,
            usuarioId: true,
            usuario: { select: { nome: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ordem) return null;

    return {
      id: ordem.id,
      codigo: ordem.codigo,
      status: ordem.status,
      observacoes: ordem.observacoes ?? null,
      valorServicos: Number(ordem.valorServicos),
      valorPecas: Number(ordem.valorPecas),
      valorTotal: Number(ordem.valorTotal),
      createdAt: ordem.createdAt,
      updatedAt: ordem.updatedAt,
      finalizadaAt: ordem.finalizadaAt ?? null,
      entregueAt: ordem.entregueAt ?? null,
      correlationId: ordem.correlationId,
      diagnosticoConcluidoAt: ordem.diagnosticoConcluidoAt ?? null,
      canceladaAt: ordem.canceladaAt ?? null,
      motivoCancelamento: ordem.motivoCancelamento ?? null,
      cliente: {
        id: ordem.cliente.id,
        nome: ordem.cliente.nome,
        cpfCnpj: ordem.cliente.cpfCnpj,
      },
      veiculo: {
        id: ordem.veiculo.id,
        placa: ordem.veiculo.placa,
        marca: ordem.veiculo.marca,
        modelo: ordem.veiculo.modelo,
        ano: ordem.veiculo.ano,
      },
      usuarioCriador: {
        id: ordem.usuarioCriador.id,
        nome: ordem.usuarioCriador.nome,
      },
      servicos: ordem.osServicos.map((s) => ({
        id: s.id,
        servicoId: s.servicoId,
        nomeSnapshot: s.nomeSnapshot,
        precoUnitario: Number(s.precoUnitario),
        quantidade: s.quantidade,
        subtotal: Number(s.subtotal),
        createdAt: s.createdAt,
      })),
      itens: ordem.osItensEstoque.map((i) => ({
        id: i.id,
        itemEstoqueId: i.itemEstoqueId,
        nomeSnapshot: i.nomeSnapshot,
        precoUnitario: Number(i.precoUnitario),
        quantidade: i.quantidade,
        subtotal: Number(i.subtotal),
        createdAt: i.createdAt,
      })),
      historicoStatus: ordem.historicoStatus.map((h) => ({
        status: h.status,
        observacao: h.observacao ?? null,
        createdAt: h.createdAt,
        usuarioId: h.usuarioId,
        usuario: h.usuario ? { nome: h.usuario.nome } : null,
      })),
    };
  }

  async findPublicByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView | null> {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: { codigo, veiculo: { is: { placa } } },
      include: {
        cliente: { select: { nome: true } },
        veiculo: {
          select: { placa: true, marca: true, modelo: true, ano: true },
        },
        osServicos: {
          select: {
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        osItensEstoque: {
          select: {
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        historicoStatus: {
          select: { status: true, observacao: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ordem) {
      return null;
    }

    return {
      codigo: ordem.codigo,
      status: ordem.status,
      observacoes: ordem.observacoes ?? null,
      valorServicos: Number(ordem.valorServicos),
      valorPecas: Number(ordem.valorPecas),
      valorTotal: Number(ordem.valorTotal),
      createdAt: ordem.createdAt,
      finalizadaAt: ordem.finalizadaAt ?? null,
      entregueAt: ordem.entregueAt ?? null,
      cliente: { nome: ordem.cliente.nome },
      veiculo: {
        placa: ordem.veiculo.placa,
        marca: ordem.veiculo.marca,
        modelo: ordem.veiculo.modelo,
        ano: ordem.veiculo.ano,
      },
      servicos: ordem.osServicos.map((s) => ({
        nomeSnapshot: s.nomeSnapshot,
        precoUnitario: Number(s.precoUnitario),
        quantidade: s.quantidade,
        subtotal: Number(s.subtotal),
      })),
      itens: ordem.osItensEstoque.map((i) => ({
        nomeSnapshot: i.nomeSnapshot,
        precoUnitario: Number(i.precoUnitario),
        quantidade: i.quantidade,
        subtotal: Number(i.subtotal),
      })),
      historicoStatus: ordem.historicoStatus.map((h) => ({
        status: h.status,
        observacao: h.observacao ?? null,
        createdAt: h.createdAt,
      })),
    };
  }

  async createComItens(
    data: CreateOrdemServicoComItensData,
    antesDoCommit?: AntesDoCommit<OrdemServico>,
  ): Promise<OrdemServico> {
    return this.prisma.$transaction(async (tx) => {
      const ano = new Date().getFullYear();
      const counterRows = await tx.$queryRaw<{ contador: number }[]>`
        INSERT INTO "OSCodigoCounter" ("ano", "contador", "updatedAt")
        VALUES (${ano}, 1, NOW())
        ON CONFLICT ("ano") DO UPDATE SET
          "contador" = "OSCodigoCounter"."contador" + 1,
          "updatedAt" = NOW()
        RETURNING "contador"
      `;
      const codigo = gerarCodigoOSSequencial(ano, counterRows[0].contador);

      const ordem = await tx.ordemServico.create({
        data: {
          codigo,
          correlationId: data.correlationId,
          clienteId: data.clienteId,
          veiculoId: data.veiculoId,
          usuarioCriadorId: data.usuarioCriadorId,
          observacoes: data.observacoes,
        },
      });

      for (const s of data.servicos) {
        const svc = await tx.servicos.findFirst({
          where: { id: s.servicoId, ativo: true },
        });
        if (!svc) throw new ServicoIndisponivelError(s.servicoId);
        const subtotal = calcularSubtotal(Number(svc.precoBase), s.quantidade);
        await tx.oSServicos.create({
          data: {
            ordemServicoId: ordem.id,
            servicoId: svc.id,
            nomeSnapshot: svc.nome,
            precoUnitario: svc.precoBase,
            quantidade: s.quantidade,
            subtotal,
          },
        });
      }

      for (const i of data.itens) {
        const item = await tx.itemEstoque.findFirst({
          where: { id: i.itemEstoqueId, ativo: true },
        });
        if (!item) throw new ItemEstoqueIndisponivelError(i.itemEstoqueId);
        if (item.quantidadeEstoque < i.quantidade) {
          throw new EstoqueInsuficienteError(
            item.nome,
            item.quantidadeEstoque,
            i.quantidade,
          );
        }
        const apos = await tx.itemEstoque.update({
          where: { id: item.id },
          data: { quantidadeEstoque: { decrement: i.quantidade } },
        });
        if (apos.quantidadeEstoque < 0) {
          throw new EstoqueInsuficienteError(
            item.nome,
            apos.quantidadeEstoque + i.quantidade,
            i.quantidade,
          );
        }
        const subtotal = calcularSubtotal(
          Number(item.precoUnitario),
          i.quantidade,
        );
        await tx.oSItemEstoque.create({
          data: {
            ordemServicoId: ordem.id,
            itemEstoqueId: item.id,
            nomeSnapshot: item.nome,
            precoUnitario: item.precoUnitario,
            quantidade: i.quantidade,
            subtotal,
          },
        });
      }

      await this.recalcularTotais(tx, ordem.id);

      await tx.historicoStatusOS.create({
        data: {
          ordemServicoId: ordem.id,
          status: 'RECEBIDA',
          usuarioId: data.usuarioCriadorId,
          observacao: null,
        },
      });

      const finalOrdem = this.toEntity(
        await tx.ordemServico.findUniqueOrThrow({ where: { id: ordem.id } }),
      );
      if (antesDoCommit) await antesDoCommit(finalOrdem);
      return finalOrdem;
    });
  }

  async update(
    id: string,
    data: UpdateOrdemServicoData,
  ): Promise<OrdemServico> {
    const ordem = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        observacoes: data.observacoes,
      },
    });
    return this.toEntity(ordem);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ordemServico.delete({ where: { id } });
  }

  async adicionarServico(
    ordemId: string,
    data: AdicionarServicoData,
  ): Promise<OSServicoLinha> {
    return this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const svc = await tx.servicos.findFirst({
        where: { id: data.servicoId, ativo: true },
      });
      if (!svc) throw new ServicoIndisponivelError(data.servicoId);

      const subtotal = calcularSubtotal(Number(svc.precoBase), data.quantidade);
      const linha = await tx.oSServicos.create({
        data: {
          ordemServicoId: ordemId,
          servicoId: svc.id,
          nomeSnapshot: svc.nome,
          precoUnitario: svc.precoBase,
          quantidade: data.quantidade,
          subtotal,
        },
      });
      await this.recalcularTotais(tx, ordemId);
      return new OSServicoLinha(
        linha.ordemServicoId,
        linha.servicoId,
        linha.nomeSnapshot,
        Number(linha.precoUnitario),
        linha.quantidade,
        Number(linha.subtotal),
        linha.id,
        linha.createdAt,
      );
    });
  }

  async removerServico(ordemId: string, linhaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const linha = await tx.oSServicos.findUnique({ where: { id: linhaId } });
      if (!linha || linha.ordemServicoId !== ordemId) {
        throw new LinhaNaoEncontradaError(linhaId);
      }
      await tx.oSServicos.delete({ where: { id: linhaId } });
      await this.recalcularTotais(tx, ordemId);
    });
  }

  async atualizarQuantidadeServico(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSServicoLinha> {
    return this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const linha = await tx.oSServicos.findUnique({ where: { id: linhaId } });
      if (!linha || linha.ordemServicoId !== ordemId) {
        throw new LinhaNaoEncontradaError(linhaId);
      }
      const subtotal = calcularSubtotal(
        Number(linha.precoUnitario),
        quantidade,
      );
      const atualizada = await tx.oSServicos.update({
        where: { id: linhaId },
        data: { quantidade, subtotal },
      });
      await this.recalcularTotais(tx, ordemId);
      return new OSServicoLinha(
        atualizada.ordemServicoId,
        atualizada.servicoId,
        atualizada.nomeSnapshot,
        Number(atualizada.precoUnitario),
        atualizada.quantidade,
        Number(atualizada.subtotal),
        atualizada.id,
        atualizada.createdAt,
      );
    });
  }

  async adicionarItemEstoque(
    ordemId: string,
    data: AdicionarItemEstoqueData,
  ): Promise<OSItemEstoqueLinha> {
    return this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const item = await tx.itemEstoque.findFirst({
        where: { id: data.itemEstoqueId, ativo: true },
      });
      if (!item) throw new ItemEstoqueIndisponivelError(data.itemEstoqueId);
      if (item.quantidadeEstoque < data.quantidade) {
        throw new EstoqueInsuficienteError(
          item.nome,
          item.quantidadeEstoque,
          data.quantidade,
        );
      }
      const apos = await tx.itemEstoque.update({
        where: { id: item.id },
        data: { quantidadeEstoque: { decrement: data.quantidade } },
      });
      if (apos.quantidadeEstoque < 0) {
        throw new EstoqueInsuficienteError(
          item.nome,
          apos.quantidadeEstoque + data.quantidade,
          data.quantidade,
        );
      }

      const subtotal = calcularSubtotal(
        Number(item.precoUnitario),
        data.quantidade,
      );
      const linha = await tx.oSItemEstoque.create({
        data: {
          ordemServicoId: ordemId,
          itemEstoqueId: item.id,
          nomeSnapshot: item.nome,
          precoUnitario: item.precoUnitario,
          quantidade: data.quantidade,
          subtotal,
        },
      });
      await this.recalcularTotais(tx, ordemId);
      return new OSItemEstoqueLinha(
        linha.ordemServicoId,
        linha.itemEstoqueId,
        linha.nomeSnapshot,
        Number(linha.precoUnitario),
        linha.quantidade,
        Number(linha.subtotal),
        linha.id,
        linha.createdAt,
      );
    });
  }

  async removerItemEstoque(ordemId: string, linhaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const linha = await tx.oSItemEstoque.findUnique({
        where: { id: linhaId },
      });
      if (!linha || linha.ordemServicoId !== ordemId) {
        throw new LinhaNaoEncontradaError(linhaId);
      }
      await tx.itemEstoque.update({
        where: { id: linha.itemEstoqueId },
        data: { quantidadeEstoque: { increment: linha.quantidade } },
      });
      await tx.oSItemEstoque.delete({ where: { id: linhaId } });
      await this.recalcularTotais(tx, ordemId);
    });
  }

  async atualizarQuantidadeItemEstoque(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSItemEstoqueLinha> {
    return this.prisma.$transaction(async (tx) => {
      await this.garantirLinhasAbertas(tx, ordemId);
      const linha = await tx.oSItemEstoque.findUnique({
        where: { id: linhaId },
      });
      if (!linha || linha.ordemServicoId !== ordemId) {
        throw new LinhaNaoEncontradaError(linhaId);
      }
      const delta = quantidade - linha.quantidade;
      if (delta > 0) {
        const item = await tx.itemEstoque.findUnique({
          where: { id: linha.itemEstoqueId },
        });
        if (!item) {
          throw new ItemEstoqueIndisponivelError(linha.itemEstoqueId);
        }
        if (item.quantidadeEstoque < delta) {
          throw new EstoqueInsuficienteError(
            item.nome,
            item.quantidadeEstoque,
            delta,
          );
        }
        const apos = await tx.itemEstoque.update({
          where: { id: item.id },
          data: { quantidadeEstoque: { decrement: delta } },
        });
        if (apos.quantidadeEstoque < 0) {
          throw new EstoqueInsuficienteError(
            item.nome,
            apos.quantidadeEstoque + delta,
            delta,
          );
        }
      } else if (delta < 0) {
        await tx.itemEstoque.update({
          where: { id: linha.itemEstoqueId },
          data: { quantidadeEstoque: { increment: -delta } },
        });
      }

      const novoSubtotal = calcularSubtotal(
        Number(linha.precoUnitario),
        quantidade,
      );
      const atualizada = await tx.oSItemEstoque.update({
        where: { id: linhaId },
        data: { quantidade, subtotal: novoSubtotal },
      });
      await this.recalcularTotais(tx, ordemId);
      return new OSItemEstoqueLinha(
        atualizada.ordemServicoId,
        atualizada.itemEstoqueId,
        atualizada.nomeSnapshot,
        Number(atualizada.precoUnitario),
        atualizada.quantidade,
        Number(atualizada.subtotal),
        atualizada.id,
        atualizada.createdAt,
      );
    });
  }

  /**
   * Único ponto por onde toda mudança de status passa — a entrega manual e as
   * transições disparadas pela Saga. Por isso a telemetria da transição é
   * emitida aqui, e não em cada caso de uso: um caminho novo que surja amanhã já
   * nasce medido, em vez de abrir um buraco silencioso no painel de tempo por
   * status.
   *
   * A duração sai do histórico, não do `updatedAt`: qualquer edição da ordem
   * mexe no `updatedAt`, enquanto o histórico só recebe registro de status. O
   * início do status atual é a primeira entrada da sequência mais recente com
   * esse status — entradas informativas (como uma tentativa de pagamento
   * recusada) repetem o status e não podem zerar a contagem.
   *
   * As opções servem à Saga: só transicionar se a OS ainda estiver no status
   * lido, devolver o estoque na compensação e publicar a mensagem antes do
   * commit (docs/contratos.md, seção 1).
   */
  async transicionarStatus(
    ordemId: string,
    novoStatus: StatusOrdemServico,
    tipoTransicao: TipoTransicaoOS,
    usuarioId: string,
    observacao: string | null,
    opcoes: OpcoesTransicao = {},
  ): Promise<OrdemServico> {
    const { ordem, inicioDoStatusAnterior, entradaNova } =
      await this.persistirTransicao(
        ordemId,
        novoStatus,
        tipoTransicao,
        usuarioId,
        observacao,
        opcoes,
      ).catch((erro: unknown) => {
        // Corrida com outra ação não é falha do sistema: quem chamou decide.
        if (!(erro instanceof OrdemServicoAlteradaError)) {
          registrarFalhaOrdemServico('transicao_status', erro, {
            ordem_id: ordemId,
            status_novo: novoStatus,
          });
        }
        throw erro;
      });

    // Só depois do commit: transição que sofreu rollback não pode aparecer
    // no painel como se tivesse acontecido.

    registrarTransicaoDeStatus({
      ordemId,
      codigo: ordem.codigo,
      statusAnterior: inicioDoStatusAnterior?.status,
      statusNovo: novoStatus,
      tipoTransicao,
      usuarioId,
      segundosNoStatus: segundosEntre(
        inicioDoStatusAnterior?.createdAt,
        entradaNova.createdAt,
      ),
      segundosDesdeAbertura: segundosEntre(
        ordem.createdAt,
        entradaNova.createdAt,
      ),
    });

    return ordem;
  }

  private persistirTransicao(
    ordemId: string,
    novoStatus: StatusOrdemServico,
    tipoTransicao: TipoTransicaoOS,
    usuarioId: string,
    observacao: string | null,
    opcoes: OpcoesTransicao,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const historico = await tx.historicoStatusOS.findMany({
        where: { ordemServicoId: ordemId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, createdAt: true },
      });
      const inicioDoStatusAnterior = inicioDoStatusAtual(historico);

      const agora = new Date();
      const updateData: Prisma.OrdemServicoUpdateManyMutationInput = {
        status: novoStatus,
      };

      if (tipoTransicao === 'ROLLBACK') {
        if (novoStatus === 'EM_EXECUCAO') updateData.finalizadaAt = null;
        if (novoStatus === 'FINALIZADA') updateData.entregueAt = null;
      } else {
        if (novoStatus === 'FINALIZADA') updateData.finalizadaAt = agora;
        if (novoStatus === 'ENTREGUE') updateData.entregueAt = agora;
        if (novoStatus === 'CANCELADA') {
          updateData.canceladaAt = agora;
          updateData.motivoCancelamento = opcoes.motivoCancelamento ?? null;
        }
      }

      // updateMany com o status no filtro: a gravação só acontece se a OS
      // ainda estiver no status que quem chamou leu.
      const { count } = await tx.ordemServico.updateMany({
        where: {
          id: ordemId,
          ...(opcoes.statusEsperados && {
            status: { in: opcoes.statusEsperados },
          }),
        },
        data: updateData,
      });
      if (count === 0) {
        throw new OrdemServicoAlteradaError(
          ordemId,
          opcoes.statusEsperados ?? [],
        );
      }

      if (opcoes.devolverEstoque) await this.devolverEstoque(tx, ordemId);

      const entradaNova = await tx.historicoStatusOS.create({
        data: {
          ordemServicoId: ordemId,
          status: novoStatus,
          usuarioId,
          observacao,
        },
        select: { createdAt: true },
      });

      const ordem = this.toEntity(
        await tx.ordemServico.findUniqueOrThrow({ where: { id: ordemId } }),
      );
      if (opcoes.antesDoCommit) await opcoes.antesDoCommit(ordem);

      return { ordem, inicioDoStatusAnterior, entradaNova };
    });
  }

  async registrarNoHistorico(
    ordemId: string,
    usuarioId: string,
    observacao: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { status } = await tx.ordemServico.findUniqueOrThrow({
        where: { id: ordemId },
        select: { status: true },
      });
      await tx.historicoStatusOS.create({
        data: { ordemServicoId: ordemId, status, usuarioId, observacao },
      });
    });
  }

  async concluirDiagnostico(
    ordemId: string,
    antesDoCommit: AntesDoCommit<SnapshotOrcamento>,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Trava as linhas: a partir daqui as edições de serviços e itens são
      // recusadas (garantirLinhasAbertas). O filtro torna a conclusão única.
      const { count } = await tx.ordemServico.updateMany({
        where: {
          id: ordemId,
          status: 'EM_DIAGNOSTICO',
          diagnosticoConcluidoAt: null,
        },
        data: { diagnosticoConcluidoAt: new Date() },
      });
      if (count === 0) return false;

      const ordem = await tx.ordemServico.findUniqueOrThrow({
        where: { id: ordemId },
        include: {
          cliente: { select: { id: true, nome: true, email: true } },
          osServicos: { orderBy: { createdAt: 'asc' } },
          osItensEstoque: { orderBy: { createdAt: 'asc' } },
        },
      });

      await antesDoCommit({
        ordem: this.toEntity(ordem),
        cliente: {
          id: ordem.cliente.id,
          nome: ordem.cliente.nome,
          email: ordem.cliente.email ?? null,
        },
        servicos: ordem.osServicos.map((s) => ({
          servicoId: s.servicoId,
          nome: s.nomeSnapshot,
          precoUnitario: Number(s.precoUnitario),
          quantidade: s.quantidade,
          subtotal: Number(s.subtotal),
        })),
        itens: ordem.osItensEstoque.map((i) => ({
          itemEstoqueId: i.itemEstoqueId,
          nome: i.nomeSnapshot,
          precoUnitario: Number(i.precoUnitario),
          quantidade: i.quantidade,
          subtotal: Number(i.subtotal),
        })),
      });
      return true;
    });
  }

  /**
   * Compensação do estoque: devolve as quantidades de todos os itens da OS. As
   * linhas continuam na OS, como registro do que tinha sido lançado. Roda dentro
   * da transação da passagem para CANCELADA, que só acontece uma vez.
   */
  private async devolverEstoque(tx: Tx, ordemId: string): Promise<void> {
    const linhas = await tx.oSItemEstoque.findMany({
      where: { ordemServicoId: ordemId },
      select: { itemEstoqueId: true, quantidade: true },
    });
    for (const linha of linhas) {
      await tx.itemEstoque.update({
        where: { id: linha.itemEstoqueId },
        data: { quantidadeEstoque: { increment: linha.quantidade } },
      });
    }
  }

  /**
   * Recusa a edição de linhas depois da conclusão do diagnóstico. O UPDATE
   * condicional também trava a linha da OS até o fim da transação: uma
   * conclusão de diagnóstico que chegue no meio espera esta edição terminar, e
   * o orçamento sai com a linha nova.
   */
  private async garantirLinhasAbertas(tx: Tx, ordemId: string): Promise<void> {
    const { count } = await tx.ordemServico.updateMany({
      where: { id: ordemId, diagnosticoConcluidoAt: null },
      data: { updatedAt: new Date() },
    });
    if (count === 0) throw new LinhasTravadasError();
  }

  private async recalcularTotais(tx: Tx, ordemId: string): Promise<void> {
    const [aggServico, aggItem] = await Promise.all([
      tx.oSServicos.aggregate({
        where: { ordemServicoId: ordemId },
        _sum: { subtotal: true },
      }),
      tx.oSItemEstoque.aggregate({
        where: { ordemServicoId: ordemId },
        _sum: { subtotal: true },
      }),
    ]);
    const valorServicos = Number(aggServico._sum.subtotal ?? 0);
    const valorPecas = Number(aggItem._sum.subtotal ?? 0);
    await tx.ordemServico.update({
      where: { id: ordemId },
      data: {
        valorServicos,
        valorPecas,
        valorTotal: valorServicos + valorPecas,
      },
    });
  }

  async getRelatorioTempoMedioPorServico(
    filtros: RelatorioTempoMedioFiltros,
  ): Promise<RelatorioTempoMedioView> {
    const { dataInicio, dataFim, servicoId } = filtros;

    const finalizadaAtFilter: { gte?: Date; lte?: Date; not: null } = {
      not: null,
    };
    if (dataInicio) finalizadaAtFilter.gte = dataInicio;
    if (dataFim) finalizadaAtFilter.lte = dataFim;

    const linhas = await this.prisma.oSServicos.findMany({
      where: {
        ...(servicoId ? { servicoId } : {}),
        ordemServico: { is: { finalizadaAt: finalizadaAtFilter } },
      },
      select: {
        ordemServicoId: true,
        servicoId: true,
        servico: {
          select: { id: true, nome: true, tempoEstimadoMin: true },
        },
        ordemServico: {
          select: { id: true, createdAt: true, finalizadaAt: true },
        },
      },
    });

    type Acc = {
      servicoId: string;
      nome: string;
      tempoEstimadoMin: number;
      tempos: number[];
    };
    const porServico = new Map<string, Acc>();
    const paresVistos = new Set<string>();
    const ordensDistintas = new Set<string>();

    for (const linha of linhas) {
      const par = `${linha.servicoId}|${linha.ordemServicoId}`;
      if (paresVistos.has(par)) continue;
      paresVistos.add(par);

      if (!linha.ordemServico.finalizadaAt) continue;

      const minutos =
        (linha.ordemServico.finalizadaAt.getTime() -
          linha.ordemServico.createdAt.getTime()) /
        60000;

      ordensDistintas.add(linha.ordemServicoId);

      const acc = porServico.get(linha.servicoId) ?? {
        servicoId: linha.servico.id,
        nome: linha.servico.nome,
        tempoEstimadoMin: linha.servico.tempoEstimadoMin,
        tempos: [],
      };
      acc.tempos.push(minutos);
      porServico.set(linha.servicoId, acc);
    }

    const servicos: TempoMedioServicoView[] = Array.from(porServico.values())
      .map((acc) => {
        const soma = acc.tempos.reduce((s, t) => s + t, 0);
        return {
          servicoId: acc.servicoId,
          nome: acc.nome,
          tempoEstimadoMin: acc.tempoEstimadoMin,
          quantidadeOS: acc.tempos.length,
          tempoMedioMinutos: Number((soma / acc.tempos.length).toFixed(2)),
          tempoMinimoMinutos: Number(Math.min(...acc.tempos).toFixed(2)),
          tempoMaximoMinutos: Number(Math.max(...acc.tempos).toFixed(2)),
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return {
      totalOrdensConsideradas: ordensDistintas.size,
      servicos,
    };
  }

  async contarLinhas(
    ordemId: string,
  ): Promise<{ servicos: number; itens: number }> {
    const [servicos, itens] = await Promise.all([
      this.prisma.oSServicos.count({
        where: { ordemServicoId: ordemId },
      }),
      this.prisma.oSItemEstoque.count({
        where: { ordemServicoId: ordemId },
      }),
    ]);
    return { servicos, itens };
  }

  async findByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<OrdemServico | null> {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: {
        codigo,
        veiculo: { placa },
      },
    });
    return ordem ? this.toEntity(ordem) : null;
  }

  private toEntity(raw: OrdemServicoModel): OrdemServico {
    return new OrdemServico(
      raw.clienteId,
      raw.veiculoId,
      raw.usuarioCriadorId,
      raw.status,
      raw.observacoes ?? null,
      Number(raw.valorServicos),
      Number(raw.valorPecas),
      Number(raw.valorTotal),
      raw.codigo,
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      raw.finalizadaAt ?? null,
      raw.entregueAt ?? null,
      raw.correlationId,
      raw.diagnosticoConcluidoAt ?? null,
      raw.canceladaAt ?? null,
      raw.motivoCancelamento ?? null,
    );
  }
}
