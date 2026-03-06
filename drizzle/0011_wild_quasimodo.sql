CREATE TABLE `rankingHistory` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`rank` int NOT NULL,
	`likes` int NOT NULL,
	`dislikes` int NOT NULL,
	`period` varchar(20) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankingHistory_id` PRIMARY KEY(`id`)
);
