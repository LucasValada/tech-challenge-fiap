-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "status" "StatusCliente" NOT NULL DEFAULT 'ATIVO';
