"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251029072327 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251029072327 extends migrations_1.Migration {
    async up() {
        this.addSql(`alter table if exists "slot_override" add column if not exists "cut_off_time" text null;`);
        this.addSql(`alter table if exists "slot_override" alter column "slot_key" type text using ("slot_key"::text);`);
        this.addSql(`alter table if exists "slot_override" alter column "slot_key" drop not null;`);
    }
    async down() {
        this.addSql(`alter table if exists "slot_override" drop column if exists "cut_off_time";`);
        this.addSql(`alter table if exists "slot_override" alter column "slot_key" type text using ("slot_key"::text);`);
        this.addSql(`alter table if exists "slot_override" alter column "slot_key" set not null;`);
    }
}
exports.Migration20251029072327 = Migration20251029072327;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMjkwNzIzMjguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LW92ZXJyaWRlcy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjUxMDI5MDcyMzI4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNEQUFpRDtBQUVqRCxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQywwRkFBMEYsQ0FBQyxDQUFBO1FBQ3ZHLElBQUksQ0FBQyxNQUFNLENBQUMsbUdBQW1HLENBQUMsQ0FBQTtRQUNoSCxJQUFJLENBQUMsTUFBTSxDQUFDLDhFQUE4RSxDQUFDLENBQUE7SUFDN0YsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsNkVBQTZFLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsTUFBTSxDQUFDLG1HQUFtRyxDQUFDLENBQUE7UUFDaEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyw2RUFBNkUsQ0FBQyxDQUFBO0lBQzVGLENBQUM7Q0FDRjtBQVpELDBEQVlDIn0=