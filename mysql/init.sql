CREATE DATABASE IF NOT EXISTS `revrock-mysql`;

DROP TABLE IF EXISTS `revrock-mysql`.`orders`;
DROP TABLE IF EXISTS `revrock-mysql`.`promotions`;
DROP TABLE IF EXISTS `revrock-mysql`.`plans`;
DROP TABLE IF EXISTS `revrock-mysql`.`users`;

CREATE TABLE `revrock-mysql`.`users` (
  `_id` INT UNIQUE NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified` TINYINT NOT NULL DEFAULT 0,
  `verification` VARCHAR(255) UNIQUE NOT NULL,
  `referral_id` VARCHAR(255) UNIQUE NOT NULL,
  `referrer` VARCHAR(255),
  `tokens` INT NOT NULL DEFAULT 10,
  `subscription` VARCHAR(255),
  PRIMARY KEY (`_id`));
  
CREATE TABLE `revrock-mysql`.`plans` (
  `_id` INT UNIQUE NOT NULL AUTO_INCREMENT,
  `plan_type` ENUM("subscribe", "refill100", "refill200", "refill500") NOT NULL,
  `price` VARCHAR(45) NULL,
  `sub_id` VARCHAR(255) NULL,
  PRIMARY KEY (`_id`));
  
CREATE TABLE `revrock-mysql`.`promotions` (
  `_id` INT UNIQUE NOT NULL AUTO_INCREMENT,
  `promo_code` VARCHAR(255) NOT NULL, 
  `promo_desc` VARCHAR(255) NOT NULL,
  `subscribe` INT,
  `refill100` INT,
  `refill200` INT,
  `refill500` INT,
  `expiration` DATETIME,
  `max_use` INT,
  `uses` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`_id`),
  FOREIGN KEY (subscribe) REFERENCES plans(_id),
  FOREIGN KEY (refill100) REFERENCES plans(_id),
  FOREIGN KEY (refill200) REFERENCES plans(_id),
  FOREIGN KEY (refill500) REFERENCES plans(_id));
  
CREATE TABLE `revrock-mysql`.`orders` (
  `_id` INT UNIQUE NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255),
  `ppl_id` VARCHAR(255),
  `purchased_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`_id`),
  FOREIGN KEY (email) REFERENCES users(email));