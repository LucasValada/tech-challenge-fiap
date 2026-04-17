import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth';
import { VeiculoModule } from './modules/veiculo';
import { ItemEstoqueModule } from './modules/item-estoque';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
