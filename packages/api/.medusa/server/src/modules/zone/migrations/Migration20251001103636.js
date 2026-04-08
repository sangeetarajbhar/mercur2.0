"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251001103636 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251001103636 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "zone" ("id" text not null, "location_id" text not null, "name" text not null, "description" text null, "postcodes" jsonb not null, "is_active" boolean not null default true, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "zone_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_zone_deleted_at" ON "zone" (deleted_at) WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop table if exists "zone" cascade;`);
    }
}
exports.Migration20251001103636 = Migration20251001103636;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMDExMDM2MzYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy96b25lL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNTEwMDExMDM2MzYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQWlEO0FBRWpELE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsTUFBTSxDQUNULGdkQUFnZCxDQUNqZCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FDVCxtR0FBbUcsQ0FDcEcsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLHNDQUFzQyxDQUFDLENBQUE7SUFDckQsQ0FBQztDQUNGO0FBYkQsMERBYUMifQ==