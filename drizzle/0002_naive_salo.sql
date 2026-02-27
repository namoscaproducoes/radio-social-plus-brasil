CREATE TABLE `songHistory` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255) NOT NULL,
	`albumCover` text,
	`playedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `songHistory_id` PRIMARY KEY(`id`)
);
