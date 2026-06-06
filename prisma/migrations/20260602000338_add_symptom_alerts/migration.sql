/*
  Warnings:

  - You are about to drop the column `data` on the `Notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ValidationCodeLog" DROP CONSTRAINT "ValidationCodeLog_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "ValidationCodeLog" DROP CONSTRAINT "ValidationCodeLog_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "ValidationCodeLog" DROP CONSTRAINT "ValidationCodeLog_patientId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "data";

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "planType" TEXT DEFAULT 'Gratuito';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "familyGroupId" TEXT,
ADD COLUMN     "familyRole" TEXT DEFAULT 'HEAD',
ADD COLUMN     "planType" TEXT DEFAULT 'Gratuito';

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "QuotationRequest" ADD COLUMN     "deliveryType" TEXT NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "genericPreference" TEXT NOT NULL DEFAULT 'ACCEPT',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
ALTER COLUMN "medicamentName" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "pharmacyId" TEXT;

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSubscription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacyId" TEXT,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "frequencyDays" INTEGER NOT NULL DEFAULT 30,
    "nextRefillDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "autoRefill" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "lastRefillDate" TIMESTAMP(3),
    "totalRefills" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Saúde',
    "author" TEXT NOT NULL DEFAULT 'Equipe Docton',
    "image" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Geral',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCRProcessing" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "processingTimeMs" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OCRProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCRDetectedDrug" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "quantity" INTEGER,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OCRDetectedDrug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCRQuoteRequest" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OCRQuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationRequestItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "form" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "quotationRequestId" TEXT NOT NULL,

    CONSTRAINT "QuotationRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationResponseItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "quotationResponseId" TEXT NOT NULL,

    CONSTRAINT "QuotationResponseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationPayment" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "responseId" TEXT,
    "patientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "asaasId" TEXT,
    "paymentMethod" TEXT,
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentUrl" TEXT,

    CONSTRAINT "QuotationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCharge" (
    "id" TEXT NOT NULL,
    "gatewayChargeId" TEXT NOT NULL,
    "gatewayProvider" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "paymentUrl" TEXT,
    "boletoLine" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "patientId" TEXT,
    "patientUserId" TEXT,
    "appointmentId" TEXT,
    "couponCode" TEXT,
    "metadata" TEXT,
    "webhookPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminWhatsappConnection" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastQrCode" TEXT,
    "connectedPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminWhatsappConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerGrowthStats" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "rankingPosition" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "estimatedLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "specialty" TEXT,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PartnerGrowthStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquiredLead" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COLD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquiredLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCity" TEXT,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "endedAt" TIMESTAMP(3),
    "objective" TEXT NOT NULL DEFAULT 'RETENTION',
    "partnerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "stats" JSONB,
    "targetAudience" JSONB,
    "type" TEXT NOT NULL DEFAULT 'PUSH',

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseContent" TEXT,
    "objective" TEXT NOT NULL DEFAULT 'RETENTION',
    "type" TEXT NOT NULL DEFAULT 'PUSH',

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthIntent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "intent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "context" JSONB,

    CONSTRAINT "HealthIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthInsight" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REVENUE_OPPORTUNITY',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "actionType" TEXT NOT NULL DEFAULT 'QUICK_CAMPAIGN',
    "actionData" JSONB,
    "isExecuted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBoost" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "price" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBoost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoostPrice" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoostPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGroup_ownerId_key" ON "FamilyGroup"("ownerId");

-- CreateIndex
CREATE INDEX "MedicationSubscription_nextRefillDate_idx" ON "MedicationSubscription"("nextRefillDate");

-- CreateIndex
CREATE INDEX "MedicationSubscription_patientId_idx" ON "MedicationSubscription"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "OCRProcessing_userId_idx" ON "OCRProcessing"("userId");

-- CreateIndex
CREATE INDEX "OCRProcessing_status_idx" ON "OCRProcessing"("status");

-- CreateIndex
CREATE INDEX "OCRDetectedDrug_processId_idx" ON "OCRDetectedDrug"("processId");

-- CreateIndex
CREATE INDEX "OCRQuoteRequest_processId_idx" ON "OCRQuoteRequest"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationPayment_quotationId_key" ON "QuotationPayment"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCharge_gatewayChargeId_key" ON "PaymentCharge"("gatewayChargeId");

-- CreateIndex
CREATE INDEX "PaymentCharge_patientId_idx" ON "PaymentCharge"("patientId");

-- CreateIndex
CREATE INDEX "PaymentCharge_patientUserId_idx" ON "PaymentCharge"("patientUserId");

-- CreateIndex
CREATE INDEX "PaymentCharge_gatewayChargeId_idx" ON "PaymentCharge"("gatewayChargeId");

-- CreateIndex
CREATE INDEX "PaymentCharge_status_idx" ON "PaymentCharge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminWhatsappConnection_instanceName_key" ON "AdminWhatsappConnection"("instanceName");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerGrowthStats_partnerId_key" ON "PartnerGrowthStats"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "BoostPrice_type_key" ON "BoostPrice"("type");

-- AddForeignKey
ALTER TABLE "MedicationSubscription" ADD CONSTRAINT "MedicationSubscription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSubscription" ADD CONSTRAINT "MedicationSubscription_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCodeLog" ADD CONSTRAINT "ValidationCodeLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCodeLog" ADD CONSTRAINT "ValidationCodeLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCodeLog" ADD CONSTRAINT "ValidationCodeLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRequestItem" ADD CONSTRAINT "QuotationRequestItem_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "QuotationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationResponseItem" ADD CONSTRAINT "QuotationResponseItem_quotationResponseId_fkey" FOREIGN KEY ("quotationResponseId") REFERENCES "QuotationResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationPayment" ADD CONSTRAINT "QuotationPayment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "QuotationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationPayment" ADD CONSTRAINT "QuotationPayment_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "QuotationResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCharge" ADD CONSTRAINT "PaymentCharge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerGrowthStats" ADD CONSTRAINT "PartnerGrowthStats_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthIntent" ADD CONSTRAINT "HealthIntent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthInsight" ADD CONSTRAINT "GrowthInsight_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBoost" ADD CONSTRAINT "PartnerBoost_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
