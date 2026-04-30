import { Module } from '@nestjs/common';
import { ServicoController } from './servico.controller';
import { ServicoRepository } from './servico.repository';
import { ServicoService } from './servico.service';

@Module({
  controllers: [ServicoController],
  providers: [ServicoService, ServicoRepository],
  exports: [ServicoService, ServicoRepository],
})
export class ServicoModule {}
