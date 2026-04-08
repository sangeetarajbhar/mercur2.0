import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260112085023 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "video_encoding_jobs" ("id" text not null, "reference_type" text check ("reference_type" in ('CMS', 'CATALOG')) not null default 'CMS', "file_name" text not null, "s3_path" text not null, "streaming_url" text null, "thumbnail_video_url" text null, "status" text check ("status" in ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED')) not null, "encoding_job_id" text null, "metadata" jsonb null, "created_by" text not null, "updated_by" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "video_encoding_jobs_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_video_encoding_jobs_deleted_at" ON "video_encoding_jobs" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_video_encoding_jobs_encoding_job_id" ON "video_encoding_jobs" ("encoding_job_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "video_encoding_jobs" cascade;`);
  }

}

