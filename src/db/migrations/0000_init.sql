CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('subscription', 'one_off');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "product_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"price_mxn" integer NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"capacity" integer,
	"stripe_price_id" text NOT NULL,
	"stripe_product_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
