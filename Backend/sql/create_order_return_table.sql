CREATE TABLE IF NOT EXISTS `order_returns` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `userId` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  `reason_code` VARCHAR(100) NULL,
  `reason_text` TEXT NULL,
  `images` TEXT NULL,
  `refund_amount` DECIMAL(10,2) NULL,
  `admin_note` TEXT NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_returns_order` (`orderId`),
  INDEX `idx_order_returns_user` (`userId`),
  INDEX `idx_order_returns_status` (`status`),
  CONSTRAINT `fk_order_returns_order`
    FOREIGN KEY (`orderId`) REFERENCES `order` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_order_returns_user`
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


