import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth";
import { VeiculoModule } from "./modules/veiculo";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MailerModule.forRootAsync({
    //   useFactory: (configService: ConfigService) => ({
    //     transport: {
    //       host: configService.get<string>('MAIL_HOST'),
    //       secure: true,
    //       port: 465,
    //       auth: {
    //         user: configService.get<string>('MAIL_USER'),
    //         pass: configService.get<string>('MAIL_PASS'),
    //       },
    //     },
    //     defaults: {
    //       from: '"Team" <noreply@example.com>',
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),
    UserModule,
    PrismaModule,
    AuthModule,
    VeiculoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
