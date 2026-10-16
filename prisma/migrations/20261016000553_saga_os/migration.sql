-- Fase 4: a OS passa a ser o orquestrador da Saga (docs/contratos.md).
--
-- Só acréscimos: dois status novos, o correlationId do fluxo e as marcas do
-- diagnóstico concluído e do cancelamento. Nada é apagado ou renomeado.

-- Status novos. PostgreSQL 12+ aceita mais de um ADD VALUE na mesma migração
-- (o RDS do projeto é PostgreSQL 17).
ALTER TYPE "StatusOrdemServico" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "StatusOrdemServico" ADD VALUE 'CANCELADA';

ALTER TABLE "OrdemServico"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "diagnosticoConcluidoAt" TIMESTAMP(3),
ADD COLUMN "canceladaAt" TIMESTAMP(3),
ADD COLUMN "motivoCancelamento" TEXT;

-- OS abertas antes da Saga ganham um correlationId próprio; só então a coluna
-- passa a ser obrigatória. Sem isto, a migração falharia em banco com dados.
UPDATE "OrdemServico" SET "correlationId" = gen_random_uuid()::text WHERE "correlationId" IS NULL;
ALTER TABLE "OrdemServico" ALTER COLUMN "correlationId" SET NOT NULL;
