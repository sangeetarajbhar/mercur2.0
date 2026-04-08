"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251001105758 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251001105758 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "slot_override" ("id" text not null, "zone_id" text not null, "slot_date" text not null, "start_time" text not null, "end_time" text not null, "total_capacity" integer not null, "remaining_capacity" integer not null, "is_active" boolean not null default true, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "slot_override_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_slot_override_deleted_at" ON "slot_override" (deleted_at) WHERE deleted_at IS NULL;`);
        this.addSql(`ALTER TABLE "slot_override" ADD CONSTRAINT "FK_slot_override_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`);
    }
    async down() {
        this.addSql(`drop table if exists "slot_override" cascade;`);
    }
}
exports.Migration20251001105758 = Migration20251001105758;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMDExMDU3NTguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LW92ZXJyaWRlcy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjUxMDAxMTA1NzU4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNEQUFpRDtBQUVqRCxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FDVCxzZ0JBQXNnQixDQUN2Z0IsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQ1QscUhBQXFILENBQ3RILENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUNULDBJQUEwSSxDQUMzSSxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsK0NBQStDLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0NBQ0Y7QUFoQkQsMERBZ0JDIn0=