import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// PrismaService é global (PrismaModule @Global), então é injetável direto aqui.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
