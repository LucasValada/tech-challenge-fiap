import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth';
import { VeiculoModule } from './modules/veiculo';
import { ItemEstoqueModule } from './modules/item-estoque';
import { ServicoModule } from './modules/servico';
import { ClienteModule } from './modules/cliente/cliente.module';
import { OrdemServicoModule } from './modules/ordem-servico';
import { ServicoModule } from './modules/servico/servico.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    VeiculoModule,
    ItemEstoqueModule,
    ServicoModule,
    ClienteModule,
    OrdemServicoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
