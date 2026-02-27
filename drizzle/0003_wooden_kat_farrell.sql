CREATE TABLE `videoCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songTitle` varchar(255) NOT NULL,
	`artistName` varchar(255) NOT NULL,
	`youtubeUrl` text NOT NULL,
	`videoId` varchar(255) NOT NULL,
	`videoUrl` text,
	`thumbnail` text,
	`title` text,
	`duration` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videoCache_id` PRIMARY KEY(`id`)
);
