-- CreateTable
CREATE TABLE "RaffleMetadata" (
    "id" SERIAL NOT NULL,
    "raffleIdOnChain" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "organizerName" TEXT NOT NULL,
    "conditions" TEXT,
    "deliveryInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaffleMetadata_raffleIdOnChain_key" ON "RaffleMetadata"("raffleIdOnChain");
