import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST || 'smtp.ethereal.email',
        port: Number(process.env.MAIL_PORT) || 587,
        auth: {
          user: process.env.MAIL_USER || '',
          pass: process.env.MAIL_PASS || '',
        },
      },
      defaults: {
        from: process.env.MAIL_FROM || '"Oficina SOAT" <noreply@oficina.com>',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
