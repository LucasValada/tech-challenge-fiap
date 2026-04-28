-- 1. Adicionar coluna nullable
ALTER TABLE "HistoricoStatusOS" ADD COLUMN "usuarioId" TEXT;

-- 2. Backfill: usar usuarioCriadorId da OS-pai para registros existentes
UPDATE "HistoricoStatusOS" h
SET "usuarioId" = o."usuarioCriadorId"
FROM "OrdemServico" o
WHERE h."ordemServicoId" = o."id";

-- 3. Tornar NOT NULL
ALTER TABLE "HistoricoStatusOS" ALTER COLUMN "usuarioId" SET NOT NULL;

-- 4. Adicionar FK
ALTER TABLE "HistoricoStatusOS"
  ADD CONSTRAINT "HistoricoStatusOS_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
