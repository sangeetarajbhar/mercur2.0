"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20250821094342 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20250821094342 extends migrations_1.Migration {
    async up() {
        this.addSql(`ALTER TABLE "stock_location_extension" DROP COLUMN "is_rain";`);
        this.addSql(`alter table if exists "stock_location_extension" add column if not exists "is_delay" boolean not null default false, add column if not exists "delay_value" text null, add column if not exists "delay_message" text null;`);
    }
    async down() {
        this.addSql(`alter table if exists "stock_location_extension" drop column if exists "is_delay", drop column if exists "delay_value", drop column if exists "delay_message";`);
    }
}
exports.Migration20250821094342 = Migration20250821094342;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTA4MjEwOTQzNDIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zdG9jay1sb2NhdGlvbi1leHRlbnNpb24vbWlncmF0aW9ucy9NaWdyYXRpb24yMDI1MDgyMTA5NDM0Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBaUQ7QUFFakQsTUFBYSx1QkFBd0IsU0FBUSxzQkFBUztJQUMzQyxLQUFLLENBQUMsRUFBRTtRQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsK0RBQStELENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsTUFBTSxDQUNULDROQUE0TixDQUM3TixDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQ1QsZ0tBQWdLLENBQ2pLLENBQUE7SUFDSCxDQUFDO0NBQ0Y7QUFiRCwwREFhQyJ9