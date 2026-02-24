CREATE TABLE `currentSong` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255) NOT NULL,
	`albumCover` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currentSong_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255) NOT NULL,
	`albumCover` text,
	`duration` int,
	`externalId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `songs_id` PRIMARY KEY(`id`),
	CONSTRAINT `songs_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`voteType` enum('like','dislike') NOT NULL,
	`userId` varchar(255),
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `votes_id` PRIMARY KEY(`id`)
);
