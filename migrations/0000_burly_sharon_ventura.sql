CREATE TABLE "catalog_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" varchar NOT NULL,
	"sequence" integer NOT NULL,
	"arkiv_entity_id" text NOT NULL,
	"arkiv_tx_hash" text,
	"metadata_entity_id" text,
	"next_chunk_id" varchar,
	"size_bytes" integer NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(10) NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"description" text,
	"cover_url" text,
	"master_playlist_id" text,
	"master_playlist_tx_hash" text,
	"price_eth" numeric(18, 10) DEFAULT '0.0001' NOT NULL,
	"rental_duration_days" integer DEFAULT 30 NOT NULL,
	"duration_seconds" integer NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(42) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"catalog_item_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_rentals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"catalog_item_id" varchar NOT NULL,
	"rental_copy_playlist_id" text,
	"rental_expires_at" timestamp NOT NULL,
	"tx_hash" text NOT NULL,
	"rental_duration_days" integer NOT NULL,
	"paid_eth" numeric(18, 10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "catalog_chunks" ADD CONSTRAINT "catalog_chunks_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rentals" ADD CONSTRAINT "user_rentals_wallet_address_profiles_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."profiles"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rentals" ADD CONSTRAINT "user_rentals_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;