import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { ServicoModule } from '../servico/servico.module';
import { ItemEstoqueModule } from '../item-estoque/item-estoque.module';
import { MailModule } from '../mail/mail.module';
import { GetAllOrdensServicoUseCase } from './application/use-case/get-all-ordens-servico.use-case';
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
import { EnviarOrcamentoUseCase } from './application/use-case/enviar-orcamento.use-case';
import { TransicionarStatusUseCase } from './application/use-case/transicionar-status.use-case';
import { ConsultarOrdemServicoPublicaUseCase } from './application/use-case/consultar-ordem-servico-publica.use-case';
import { AprovarOrcamentoPublicoUseCase } from './application/use-case/aprovar-orcamento-publico.use-case';
import { RelatorioTempoMedioUseCase } from './application/use-case/relatorio-tempo-medio.use-case';
import { ProcessarWebhookOrcamentoUseCase } from './application/use-case/processar-webhook-orcamento.use-case';
import { OrdemServicoController } from './interface/controller/ordem-servico.controller';
import { PublicOrdemServicoController } from './interface/controller/public-ordem-servico.controller';
import { RelatorioOrdemServicoController } from './interface/controller/relatorio-ordem-servico.controller';
import { WebhookOrcamentoController } from './interface/controller/webhook-orcamento.controller';
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
    WebhookOrcamentoController,
  ],
  providers: [
    GetAllOrdensServicoUseCase,
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
    EnviarOrcamentoUseCase,
    TransicionarStatusUseCase,
    ConsultarOrdemServicoPublicaUseCase,
    AprovarOrcamentoPublicoUseCase,
    RelatorioTempoMedioUseCase,
    ProcessarWebhookOrcamentoUseCase,
    {
      provide: 'ORDEM_SERVICO_REPOSITORY',
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
