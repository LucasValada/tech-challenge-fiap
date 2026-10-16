import { Module } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { ServicoModule } from '../servico/servico.module';
import { ItemEstoqueModule } from '../item-estoque/item-estoque.module';
import { MailModule } from '../mail/mail.module';
import { GetAllOrdensServicoUseCase } from './application/use-case/get-all-ordens-servico.use-case';
import { GetMinhasOrdensServicoUseCase } from './application/use-case/get-minhas-ordens-servico.use-case';
import { GetMinhaOrdemServicoUseCase } from './application/use-case/get-minha-ordem-servico.use-case';
import { GetOrdemServicoByIdUseCase } from './application/use-case/get-ordem-servico-by-id.use-case';
import { CreateOrdemServicoUseCase } from './application/use-case/create-ordem-servico.use-case';
import { UpdateOrdemServicoUseCase } from './application/use-case/update-ordem-servico.use-case';
import { DeleteOrdemServicoUseCase } from './application/use-case/delete-ordem-servico.use-case';
import { AdicionarServicoOSUseCase } from './application/use-case/adicionar-servico-os.use-case';
import { AtualizarQuantidadeServicoUseCase } from './application/use-case/atualizar-quantidade-servico.use-case';
import { RemoverServicoOSUseCase } from './application/use-case/remover-servico-os.use-case';
import { AdicionarItemEstoqueOSUseCase } from './application/use-case/adicionar-item-estoque-os.use-case';
import { AtualizarQuantidadeItemEstoqueUseCase } from './application/use-case/atualizar-quantidade-item-estoque.use-case';
import { RemoverItemEstoqueOSUseCase } from './application/use-case/remover-item-estoque-os.use-case';
import { CancelarOrdemServicoUseCase } from './application/use-case/cancelar-ordem-servico.use-case';
import { ProcessarRespostaSagaUseCase } from './application/use-case/processar-resposta-saga.use-case';
import { NotificadorStatusOS } from './application/shared/notificador-status-os';
import { PUBLICADOR_COMANDOS } from './application/saga/mensagens-saga';
import { RespostasSagaConsumer } from './interface/consumer/respostas-saga.consumer';
import { PublicadorComandosSqs } from '../../infra/mensageria/publicador-comandos.sqs';
import { TransicionarStatusUseCase } from './application/use-case/transicionar-status.use-case';
import { ConsultarOrdemServicoPublicaUseCase } from './application/use-case/consultar-ordem-servico-publica.use-case';
import { RelatorioTempoMedioUseCase } from './application/use-case/relatorio-tempo-medio.use-case';
import { OrdemServicoController } from './interface/controller/ordem-servico.controller';
import { PublicOrdemServicoController } from './interface/controller/public-ordem-servico.controller';
import { RelatorioOrdemServicoController } from './interface/controller/relatorio-ordem-servico.controller';
import { PrismaOrdemServicoRepository } from '../../infra/database/prisma/repositories/prisma.ordem-servico.repository';

@Module({
  imports: [
    PrismaModule,
    ClienteModule,
    VeiculoModule,
    ServicoModule,
    ItemEstoqueModule,
    MailModule,
  ],
  controllers: [
    OrdemServicoController,
    PublicOrdemServicoController,
    RelatorioOrdemServicoController,
  ],
  providers: [
    GetAllOrdensServicoUseCase,
    GetMinhasOrdensServicoUseCase,
    GetMinhaOrdemServicoUseCase,
    GetOrdemServicoByIdUseCase,
    CreateOrdemServicoUseCase,
    UpdateOrdemServicoUseCase,
    DeleteOrdemServicoUseCase,
    AdicionarServicoOSUseCase,
    AtualizarQuantidadeServicoUseCase,
    RemoverServicoOSUseCase,
    AdicionarItemEstoqueOSUseCase,
    AtualizarQuantidadeItemEstoqueUseCase,
    RemoverItemEstoqueOSUseCase,
    CancelarOrdemServicoUseCase,
    ProcessarRespostaSagaUseCase,
    NotificadorStatusOS,
    RespostasSagaConsumer,
    TransicionarStatusUseCase,
    ConsultarOrdemServicoPublicaUseCase,
    RelatorioTempoMedioUseCase,
    {
      provide: PUBLICADOR_COMANDOS,
      inject: [SQSClient],
      useFactory: (sqs: SQSClient) =>
        new PublicadorComandosSqs(sqs, {
          execution: process.env.EXECUTION_COMMANDS_QUEUE_URL ?? '',
          billing: process.env.BILLING_COMMANDS_QUEUE_URL ?? '',
        }),
    },
    {
      provide: 'ORDEM_SERVICO_REPOSITORY',
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
