CREATE TABLE `userVotes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`songId` int NOT NULL,
	`voteType` enum('like','dislike') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userVotes_id` PRIMARY KEY(`id`)
);
