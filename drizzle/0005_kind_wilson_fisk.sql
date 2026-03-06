ALTER TABLE `script_shots` MODIFY COLUMN `videoEngine` enum('seedance_1_5','veo_3_1','kling_3_0');--> statement-breakpoint
ALTER TABLE `video_jobs` MODIFY COLUMN `engine` enum('seedance_1_5','veo_3_1','kling_3_0') NOT NULL;--> statement-breakpoint
ALTER TABLE `overseas_assets` ADD `isGlobalRef` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `overseas_assets` ADD `sortOrder` int DEFAULT 0 NOT NULL;