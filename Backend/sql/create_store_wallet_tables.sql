-- ✅ สร้างตารางสำหรับระบบ Store Wallet (กระเป๋าเงินร้านค้า)

-- 1) ตาราง store_wallet (One-to-One กับ store)
-- หมายเหตุ: ใช้ INT (signed) ให้ตรงกับ store.id
CREATE TABLE IF NOT EXISTS `store_wallet` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `storeId` INT NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_store_wallet_storeId` (`storeId`),
  CONSTRAINT `FK_store_wallet_store` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) ตาราง store_wallet_transaction (ประวัติการเคลื่อนไหวของกระเป๋าเงินร้านค้า)
CREATE TABLE IF NOT EXISTS `store_wallet_transaction` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `walletId` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('SALE_REVENUE', 'WITHDRAWAL', 'ADJUSTMENT') NOT NULL,
  `referenceId` VARCHAR(255) NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `IDX_store_wallet_transaction_walletId_createdAt` (`walletId`, `createdAt`),
  CONSTRAINT `FK_store_wallet_transaction_wallet` FOREIGN KEY (`walletId`) REFERENCES `store_wallet`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) ตาราง store_withdrawal_request (คำขอถอนเงินของร้านค้า)
CREATE TABLE IF NOT EXISTS `store_withdrawal_request` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `storeId` INT NOT NULL,
  `walletId` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `bankName` VARCHAR(100) NULL,
  `accountNumber` VARCHAR(50) NULL,
  `accountName` VARCHAR(255) NULL,
  `proofImage` VARCHAR(500) NULL,
  `adminNote` TEXT NULL,
  `processedBy` INT NULL,
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `IDX_store_withdrawal_request_storeId` (`storeId`),
  KEY `IDX_store_withdrawal_request_walletId` (`walletId`),
  KEY `IDX_store_withdrawal_request_status` (`status`),
  KEY `IDX_store_withdrawal_request_createdAt` (`createdAt`),
  CONSTRAINT `FK_store_withdrawal_request_store` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_store_withdrawal_request_wallet` FOREIGN KEY (`walletId`) REFERENCES `store_wallet`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) สร้าง Wallet ให้กับร้านค้าที่มีอยู่แล้ว (Optional)
-- INSERT INTO store_wallet (storeId, balance)
-- SELECT id, 0.00 FROM store WHERE id NOT IN (SELECT storeId FROM store_wallet);
