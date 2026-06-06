-- AlterTable
ALTER TABLE "HealthLog" ADD COLUMN     "category" TEXT,
ADD COLUMN     "inputs" JSONB,
ADD COLUMN     "interpretation" TEXT,
ADD COLUMN     "recommendations" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Optional: Update existing rows to set updatedAt = createdAt if needed
UPDATE "HealthLog" SET "updatedAt" = "createdAt" WHERE "updatedAt" = NOW();
