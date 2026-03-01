CREATE TABLE `api_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'gemini',
	`model` varchar(128) NOT NULL DEFAULT 'gemini-3-flash-preview',
	`apiKey` text,
	`apiBaseUrl` text,
	`lastTestStatus` varchar(16) DEFAULT 'untested',
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `asset_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`user_id` int NOT NULL,
	`image_type` varchar(50) NOT NULL,
	`image_url` text NOT NULL,
	`prompt` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `asset_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`type` enum('character','scene','prop') NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`mjPrompt` text,
	`mainPrompt` text,
	`uploadedImageUrl` text,
	`mainImageUrl` text,
	`multiViewUrls` text,
	`generationModel` varchar(64),
	`status` enum('draft','generating','done','failed') NOT NULL DEFAULT 'draft',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`delta` int NOT NULL,
	`balance` int NOT NULL,
	`action` enum('register_bonus','admin_grant','stripe_purchase','analyze_script','generate_shot','generate_prompt') NOT NULL,
	`projectId` int,
	`note` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`created_by` int NOT NULL DEFAULT 0,
	`used_by` int,
	`used_at` bigint,
	`expires_at` bigint,
	`max_uses` int NOT NULL DEFAULT 1,
	`use_count` int NOT NULL DEFAULT 0,
	`note` varchar(255),
	`created_at` bigint NOT NULL,
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSessionId` varchar(256),
	`credits` int NOT NULL,
	`amountFen` int NOT NULL,
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL DEFAULT '未命名项目',
	`data` text NOT NULL DEFAULT ('{}'),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `identifier` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `identifierType` enum('email','phone');--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `credits` int DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_identifier_unique` UNIQUE(`identifier`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `openId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loginMethod`;