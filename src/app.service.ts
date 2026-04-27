import { Injectable } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello(): Promise<string> {
    await this.prisma.$queryRaw`SELECT 1`;
    return 'Chegou no banco carai';
  }
}
