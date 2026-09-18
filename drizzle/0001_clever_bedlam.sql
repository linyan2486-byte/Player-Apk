CREATE TABLE `media_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(80) NOT NULL,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255) DEFAULT 'Mg Flâsh',
	`kind` enum('audio','video') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(160),
	`fileSize` int,
	`published` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_catalog_publicId_unique` UNIQUE(`publicId`)
);
