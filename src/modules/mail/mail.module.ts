import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST') ?? 'smtp.ethereal.email',
          port: Number(config.get<string>('MAIL_PORT')) || 587,
          auth: {
            user: config.get<string>('MAIL_USER') ?? '',
            pass: config.get<string>('MAIL_PASS') ?? '',
          },
        },
        defaults: {
          from:
            config.get<string>('MAIL_FROM') ??
            '"Oficina SOAT" <noreply@oficina.com>',
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
