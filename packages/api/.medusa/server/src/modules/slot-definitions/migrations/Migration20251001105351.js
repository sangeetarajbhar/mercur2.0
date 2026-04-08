"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251001105351 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251001105351 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "slot_definition" ("id" text not null, "zone_id" text not null, "slot_key" text not null, "start_time" text not null, "end_time" text not null, "default_capacity" integer not null, "is_active" boolean not null default true, "cut_off_time" text not null, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "slot_definition_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_slot_definition_deleted_at" ON "slot_definition" (deleted_at) WHERE deleted_at IS NULL;`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "idx_slot_def_zone" ON "slot_definition" (zone_id);`);
        this.addSql(`ALTER TABLE "slot_definition" ADD CONSTRAINT "FK_slot_definition_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`);
    }
    async down() {
        this.addSql(`drop table if exists "slot_definition" cascade;`);
    }
}
exports.Migration20251001105351 = Migration20251001105351;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMDExMDUzNTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LWRlZmluaXRpb25zL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNTEwMDExMDUzNTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQWlEO0FBRWpELE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsTUFBTSxDQUNULDBpQkFBMGlCLENBQzNpQixDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FDVCx5SEFBeUgsQ0FDMUgsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZ0ZBQWdGLENBQUMsQ0FBQTtRQUM3RixJQUFJLENBQUMsTUFBTSxDQUNULDhJQUE4SSxDQUMvSSxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsaURBQWlELENBQUMsQ0FBQTtJQUNoRSxDQUFDO0NBQ0Y7QUFqQkQsMERBaUJDIn0=