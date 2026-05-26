CREATE TABLE IF NOT EXISTS "rate_limit_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"ip" "inet" NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_endpoint_ip_attempted" ON "rate_limit_attempts" USING btree ("endpoint","ip","attempted_at" DESC NULLS LAST);