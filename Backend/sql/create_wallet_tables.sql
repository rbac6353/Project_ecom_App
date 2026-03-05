-- ✅ สร้างตารางสำหรับระบบ My Wallet

-- 1) ตาราง wallet (One-to-One กับ user)
CREATE TABLE IF NOT EXISTS `wallet` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` INT UNSIGNED NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_wallet_userId` (`userId`),
  CONSTRAINT `FK_wallet_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) ตาราง wallet_transaction (ประวัติการเคลื่อนไหวของกระเป๋าเงิน)
CREATE TABLE IF NOT EXISTS `wallet_transaction` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `walletId` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND') NOT NULL,
  `referenceId` VARCHAR(255) NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `IDX_wallet_transaction_walletId_createdAt` (`walletId`, `createdAt`),
  CONSTRAINT `FK_wallet_transaction_wallet` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

