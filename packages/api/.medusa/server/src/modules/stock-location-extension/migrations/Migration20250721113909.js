"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20250721113909 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20250721113909 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "stock_location_extension" ("id" text not null, "location_type" text not null, "address_type" text not null, "latitude" real null, "longitude" real null, "partner_id" text not null, "return_location_id" text not null, "status" text not null, "servisibility_status" text not null, "start_time" text not null, "end_time" text not null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_extension_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_extension_deleted_at" ON "stock_location_extension" (deleted_at) WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop table if exists "stock_location_extension" cascade;`);
    }
}
exports.Migration20250721113909 = Migration20250721113909;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTA3MjExMTM5MDkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zdG9jay1sb2NhdGlvbi1leHRlbnNpb24vbWlncmF0aW9ucy9NaWdyYXRpb24yMDI1MDcyMTExMzkwOS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBaUQ7QUFFakQsTUFBYSx1QkFBd0IsU0FBUSxzQkFBUztJQUMzQyxLQUFLLENBQUMsRUFBRTtRQUNmLElBQUksQ0FBQyxNQUFNLENBQ1QsMmxCQUEybEIsQ0FDNWxCLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUNULDJJQUEySSxDQUM1SSxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsMERBQTBELENBQUMsQ0FBQTtJQUN6RSxDQUFDO0NBQ0Y7QUFiRCwwREFhQyJ9