ALTER TABLE `media_catalog` ADD `storageProvider` varchar(32) DEFAULT 'forge' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_catalog` ADD `telegramFileId` varchar(256);--> statement-breakpoint
ALTER TABLE `media_catalog` ADD `telegramMessageId` int;