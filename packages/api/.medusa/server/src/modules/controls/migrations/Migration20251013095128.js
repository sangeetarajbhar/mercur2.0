"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251013095127 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251013095127 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "control" ("id" text not null, "scope" text check ("scope" in ('zone', 'darkstore')) not null, "scope_id" text not null, "is_instant_enabled" boolean not null default true, "is_slotted_enabled" boolean not null default true, "delay_minutes" integer not null default 0, "delay_message" text null, "message_icon" text null, "reason" jsonb null, "is_active" boolean not null default true, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "control_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_control_deleted_at" ON "control" (deleted_at) WHERE deleted_at IS NULL;`);
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_control_scope_scope_id" ON "control" (scope, scope_id) WHERE deleted_at IS NULL;`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_control_scope_scopeid" ON "control" (scope, scope_id);`);
    }
    async down() {
        this.addSql(`drop table if exists "control" cascade;`);
    }
}
exports.Migration20251013095127 = Migration20251013095127;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMTMwOTUxMjguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9jb250cm9scy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjUxMDEzMDk1MTI4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNEQUFrRDtBQUVsRCxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBRTNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyw4bkJBQThuQixDQUFDLENBQUM7UUFDNW9CLElBQUksQ0FBQyxNQUFNLENBQUMseUdBQXlHLENBQUMsQ0FBQztRQUN2SCxJQUFJLENBQUMsTUFBTSxDQUFDLHlIQUF5SCxDQUFDLENBQUM7UUFDdkksSUFBSSxDQUFDLE1BQU0sQ0FBQyx3RkFBd0YsQ0FBQyxDQUFDO0lBRXhHLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7SUFDekQsQ0FBQztDQUVGO0FBZEQsMERBY0MifQ==