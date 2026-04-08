"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251001104832 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251001104832 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "instant_promise" ("id" text not null, "zone_id" text not null, "promise_text" text not null, "promise_minutes" integer not null, "pickup_lead_minutes" integer not null default 0, "return_lead_minutes" integer not null default 0, "is_active" boolean not null default true, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "instant_promise_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_instant_promise_deleted_at" ON "instant_promise" (deleted_at) WHERE deleted_at IS NULL;`);
        this.addSql(`ALTER TABLE "instant_promise" ADD CONSTRAINT "FK_instant_promise_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`);
    }
    async down() {
        this.addSql(`drop table if exists "instant_promise" cascade;`);
    }
}
exports.Migration20251001104832 = Migration20251001104832;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMDExMDQ4MzIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9pbnN0YW50LXByb21pc2VzL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNTEwMDExMDQ4MzIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQWlEO0FBRWpELE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsTUFBTSxDQUNULDZqQkFBNmpCLENBQzlqQixDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FDVCx5SEFBeUgsQ0FDMUgsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQ1QsOElBQThJLENBQy9JLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUk7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpREFBaUQsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7Q0FDRjtBQWhCRCwwREFnQkMifQ==