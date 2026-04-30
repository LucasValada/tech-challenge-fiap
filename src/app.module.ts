import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth';
import { VeiculoModule } from './modules/veiculo';
import { ItemEstoqueModule } from './modules/item-estoque';
import { ServicoModule } from './modules/servico';
import { ClientModule } from './modules/cliente/client.module';
import { OrdemServicoModule } from './modules/ordem-servico';

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
    ClientModule,
    OrdemServicoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
