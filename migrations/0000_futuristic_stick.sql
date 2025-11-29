CREATE TABLE "laminate_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "laminate_memory_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "laminate_wood_grains_preference" (
	"id" serial PRIMARY KEY NOT NULL,
	"laminate_code" varchar(255) NOT NULL,
	"wood_grains_enabled" varchar(10) DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "laminate_wood_grains_preference_laminate_code_unique" UNIQUE("laminate_code")
);
--> statement-breakpoint
CREATE TABLE "plywood_brand_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plywood_brand_memory_brand_unique" UNIQUE("brand")
);
--> statement-breakpoint
CREATE TABLE "quick_shutter_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_name" varchar(255),
	"plywood_brand" varchar(255),
	"laminate_type" varchar(50),
	"laminate_code" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
