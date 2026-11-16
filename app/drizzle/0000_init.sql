CREATE TABLE `employers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`notes` text,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE restrict ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `employers_user_id_idx` ON `employers` (`user_id`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(100) NOT NULL,
	`posting_url` text(255),
	`pay_range_lower_cents` integer,
	`pay_range_upper_cents` integer,
	`notes` text,
	`employer_id` integer,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`employer_id`) REFERENCES `employers`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE restrict ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `positions_user_id_idx` ON `positions` (`user_id`);--> statement-breakpoint
CREATE INDEX `positions_employer_id_idx` ON `positions` (`employer_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`password_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_email_lowercase" CHECK("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);