"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251205062700 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20251205062700 extends migrations_1.Migration {
    async up() {
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slot_override_zone_date_time" ON "slot_override" ("zone_id", "slot_date", "start_time", "end_time") WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop index if exists "UQ_slot_override_zone_date_time";`);
    }
}
exports.Migration20251205062700 = Migration20251205062700;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEyMDUwNjI3MDAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LW92ZXJyaWRlcy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjUxMjA1MDYyNzAwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlFQUFvRTtBQUVwRSxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FDVCxxS0FBcUssQ0FDdEssQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLHlEQUF5RCxDQUFDLENBQUE7SUFDeEUsQ0FBQztDQUNGO0FBVkQsMERBVUMifQ==