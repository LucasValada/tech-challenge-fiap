-- CreateTable
CREATE TABLE "OSCodigoCounter" (
    "ano" INTEGER NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OSCodigoCounter_pkey" PRIMARY KEY ("ano")
);
