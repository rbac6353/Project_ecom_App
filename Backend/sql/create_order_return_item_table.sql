CREATE TABLE IF NOT EXISTS `order_return_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderReturnId` INT NOT NULL,
  `orderItemId` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unitPrice` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_order_return_items_return` (`orderReturnId`),
  INDEX `idx_order_return_items_order_item` (`orderItemId`),
  CONSTRAINT `fk_order_return_items_return`
    FOREIGN KEY (`orderReturnId`) REFERENCES `order_returns` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_order_return_items_order_item`
    FOREIGN KEY (`orderItemId`) REFERENCES `productonorder` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


