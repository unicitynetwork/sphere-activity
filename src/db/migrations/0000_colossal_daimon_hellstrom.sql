CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`unicity_id` text,
	`data` text,
	`is_public` integer DEFAULT false,
	`created_at` integer NOT NULL
);
