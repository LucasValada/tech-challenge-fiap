import { Module } from '@nestjs/common';
import { NestMailerEmailSender } from './infra/nest-mailer.email-sender';

@Module({
  providers: [
    { provide: 'EMAIL_SENDER', useClass: NestMailerEmailSender },
  ],
  exports: ['EMAIL_SENDER'],
})
export class MailModule {}
