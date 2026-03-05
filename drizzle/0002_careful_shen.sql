CREATE TABLE `overseas_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL DEFAULT '未命名剧集',
	`market` varchar(32) NOT NULL DEFAULT 'us',
	`aspectRatio` enum('landscape','portrait') NOT NULL DEFAULT 'portrait',
	`style` enum('realistic','animation','cg') NOT NULL DEFAULT 'realistic',
	`genre` varchar(64) NOT NULL DEFAULT 'romance',
	`totalEpisodes` int DEFAULT 20,
	`status` enum('draft','in_progress','completed') NOT NULL DEFAULT 'draft',
	`characters` text DEFAULT ('[]'),
	`scenes` text DEFAULT ('[]'),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overseas_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `script_shots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`episodeNumber` int NOT NULL,
	`shotNumber` int NOT NULL,
	`sceneName` varchar(128),
	`shotType` varchar(64),
	`visualDescription` text,
	`dialogue` text,
	`characters` varchar(256),
	`emotion` varchar(64),
	`firstFrameUrl` text,
	`lastFrameUrl` text,
	`firstFramePrompt` text,
	`lastFramePrompt` text,
	`videoUrl` text,
	`videoPrompt` text,
	`videoEngine` enum('seedance_1_5','veo_3_1'),
	`videoDuration` int,
	`status` enum('draft','generating_frame','frame_done','generating_video','done','failed') NOT NULL DEFAULT 'draft',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `script_shots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shotId` int NOT NULL,
	`engine` enum('seedance_1_5','veo_3_1') NOT NULL,
	`externalJobId` varchar(512),
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`videoUrl` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_jobs_id` PRIMARY KEY(`id`)
);
