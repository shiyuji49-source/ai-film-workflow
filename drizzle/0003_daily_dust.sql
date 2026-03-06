CREATE TABLE `overseas_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('character','scene','prop') NOT NULL DEFAULT 'character',
	`name` varchar(255) NOT NULL,
	`description` text,
	`mjPrompt` text,
	`nbpPrompt` text,
	`mjImageUrl` text,
	`mainImageUrl` text,
	`viewFrontUrl` text,
	`viewSideUrl` text,
	`viewBackUrl` text,
	`tags` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overseas_assets_id` PRIMARY KEY(`id`)
);
