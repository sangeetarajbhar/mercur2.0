"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251010150655 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251010150655 extends migrations_1.Migration {
    async up() {
        this.addSql(`alter table if exists "slot_override" add column if not exists "slot_key" text null;`);
    }
    async down() {
        this.addSql(`alter table if exists "slot_override" drop column if exists "slot_key";`);
    }
}
exports.Migration20251010150655 = Migration20251010150655;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMTAxNTA2NTUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LW92ZXJyaWRlcy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjUxMDEwMTUwNjU1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNEQUFpRDtBQUVqRCxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzRkFBc0YsQ0FBQyxDQUFBO0lBQ3JHLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLHlFQUF5RSxDQUFDLENBQUE7SUFDeEYsQ0FBQztDQUNGO0FBUkQsMERBUUMifQ==