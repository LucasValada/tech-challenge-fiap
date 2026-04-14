import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(userEmail: string): Promise<void> {
    await this.mailerService.sendMail({
      to: userEmail,
      subject: 'Welcome to the platform',
      template: 'welcome', // .pug, .ejs, or .hbs extension is appended automatically
      context: {
        name: 'John Doe',
        code: 'cf1a3f828287',
      },
    });
  }
}