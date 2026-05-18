/*
  Warnings:

  - Added the required column `clientId` to the `Building` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Building` ADD COLUMN `clientId` CHAR(36) NOT NULL;

-- CreateTable
CREATE TABLE `B2BClient` (
    `id` CHAR(36) NOT NULL,
    `companyName` VARCHAR(255) NOT NULL,
    `subdomain` VARCHAR(100) NOT NULL,
    `accountType` ENUM('BUILDING', 'ADCOMPLEX') NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `userQuota` INTEGER NOT NULL,
    `buildingQuota` INTEGER NULL,
    `paymentPlan` VARCHAR(100) NOT NULL,
    `paymentAccessRole` VARCHAR(50) NOT NULL,
    `contractStartDate` DATETIME(3) NOT NULL,
    `contractEndDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `B2BClient_companyName_key`(`companyName`),
    UNIQUE INDEX `B2BClient_subdomain_key`(`subdomain`),
    INDEX `B2BClient_subdomain_idx`(`subdomain`),
    INDEX `B2BClient_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuildHubAdminUser` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `role` ENUM('SUPERADMIN', 'ADMIN_DASHBOARD') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BuildHubAdminUser_email_key`(`email`),
    INDEX `BuildHubAdminUser_email_idx`(`email`),
    INDEX `BuildHubAdminUser_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientDeletionRequest` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `requestedById` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(500) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `approvalNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ClientDeletionRequest_clientId_idx`(`clientId`),
    INDEX `ClientDeletionRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetLog` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `resetById` CHAR(36) NOT NULL,
    `resetByRole` VARCHAR(50) NOT NULL,
    `userEmail` VARCHAR(255) NOT NULL,
    `userRole` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordResetLog_userId_idx`(`userId`),
    INDEX `PasswordResetLog_resetById_idx`(`resetById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BoardMember` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `joinedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `termStart` DATETIME(3) NOT NULL,
    `termEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BoardMember_buildingId_idx`(`buildingId`),
    INDEX `BoardMember_userId_idx`(`userId`),
    INDEX `BoardMember_clientId_idx`(`clientId`),
    UNIQUE INDEX `BoardMember_userId_buildingId_key`(`userId`, `buildingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeneralMeeting` (
    `id` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` VARCHAR(191) NULL,
    `meetingDate` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `createdById` CHAR(36) NOT NULL,
    `minutesDocId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GeneralMeeting_minutesDocId_key`(`minutesDocId`),
    INDEX `GeneralMeeting_buildingId_idx`(`buildingId`),
    INDEX `GeneralMeeting_clientId_idx`(`clientId`),
    INDEX `GeneralMeeting_meetingDate_idx`(`meetingDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialDocument` (
    `id` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(50) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `documentType` ENUM('MEETING_MINUTES', 'FINANCIAL_STATEMENT', 'BUDGET', 'AUDIT_REPORT', 'INSURANCE', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NULL,
    `uploadedById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancialDocument_buildingId_idx`(`buildingId`),
    INDEX `FinancialDocument_clientId_idx`(`clientId`),
    INDEX `FinancialDocument_documentType_idx`(`documentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuildingExpense` (
    `id` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BuildingExpense_buildingId_idx`(`buildingId`),
    INDEX `BuildingExpense_clientId_idx`(`clientId`),
    INDEX `BuildingExpense_expenseDate_idx`(`expenseDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `ticketType` ENUM('TECHNICAL', 'OPERATIONAL') NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `category` VARCHAR(100) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `submittedById` CHAR(36) NOT NULL,
    `submittedByEmail` VARCHAR(255) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `resolutionNotes` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportTicket_clientId_idx`(`clientId`),
    INDEX `SupportTicket_status_idx`(`status`),
    INDEX `SupportTicket_ticketType_idx`(`ticketType`),
    INDEX `SupportTicket_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComplexAmenity` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplexAmenity_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Building_clientId_idx` ON `Building`(`clientId`);

-- AddForeignKey
ALTER TABLE `ClientDeletionRequest` ADD CONSTRAINT `ClientDeletionRequest_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientDeletionRequest` ADD CONSTRAINT `ClientDeletionRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `BuildHubAdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientDeletionRequest` ADD CONSTRAINT `ClientDeletionRequest_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `BuildHubAdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetLog` ADD CONSTRAINT `PasswordResetLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetLog` ADD CONSTRAINT `PasswordResetLog_resetById_fkey` FOREIGN KEY (`resetById`) REFERENCES `BuildHubAdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Building` ADD CONSTRAINT `Building_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneralMeeting` ADD CONSTRAINT `GeneralMeeting_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneralMeeting` ADD CONSTRAINT `GeneralMeeting_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneralMeeting` ADD CONSTRAINT `GeneralMeeting_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneralMeeting` ADD CONSTRAINT `GeneralMeeting_minutesDocId_fkey` FOREIGN KEY (`minutesDocId`) REFERENCES `FinancialDocument`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialDocument` ADD CONSTRAINT `FinancialDocument_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialDocument` ADD CONSTRAINT `FinancialDocument_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialDocument` ADD CONSTRAINT `FinancialDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuildingExpense` ADD CONSTRAINT `BuildingExpense_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuildingExpense` ADD CONSTRAINT `BuildingExpense_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `BuildHubAdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplexAmenity` ADD CONSTRAINT `ComplexAmenity_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `B2BClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
