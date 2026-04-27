import { Migration } from "@mikro-orm/migrations"

export class Migration20260408120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "rating_config" (
        "id" text not null,
        "status" text check ("status" in ('active', 'inactive', 'draft')) not null default 'active',
        "option_text" text null,
        "sort_order" integer not null default 0,
        "created_by" text null,
        "updated_by" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "rating_config_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_rating_config_deleted_at"
      ON "rating_config" (deleted_at) WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      create table if not exists "rating_feedback" (
        "id" text not null,
        "session_id" text not null,
        "status" text check ("status" in ('active', 'archived')) not null default 'active',
        "customer_id" text null,
        "order_id" text null,
        "rating" integer not null,
        "option_id" text null,
        "custom_text" text null,
        "created_by" text null,
        "updated_by" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "rating_feedback_pkey" primary key ("id"),
        constraint "CHK_rating_feedback_rating_range" check ("rating" >= 1 and "rating" <= 5)
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_rating_feedback_deleted_at"
      ON "rating_feedback" (deleted_at) WHERE deleted_at IS NULL;
    `)

    // Make sure column exists (in case table pre-existed without it).
    this.addSql(`ALTER TABLE "rating_feedback" ADD COLUMN IF NOT EXISTS "option_id" text NULL;`)

    // Keep FK constraint for option_id → rating_config.id (requested), but make it idempotent.
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_rating_feedback_option'
        ) THEN
          ALTER TABLE "rating_feedback"
          ADD CONSTRAINT "FK_rating_feedback_option"
          FOREIGN KEY ("option_id") REFERENCES "rating_config" ("id");
        END IF;
      END $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rating_feedback" cascade;`)
    this.addSql(`drop table if exists "rating_config" cascade;`)
  }
}

