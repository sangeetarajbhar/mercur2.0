"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251011073409 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20251011073409 extends migrations_1.Migration {
    async up() {
        this.addSql(`alter table if exists "zone" add column if not exists "start_time" text null, add column if not exists "end_time" text null;`);
    }
    async down() {
        this.addSql(`alter table if exists "zone" drop column if exists "start_time", drop column if exists "end_time";`);
    }
}
exports.Migration20251011073409 = Migration20251011073409;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEwMTEwNzM0MDkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy96b25lL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNTEwMTEwNzM0MDkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQWlEO0FBRWpELE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsTUFBTSxDQUNULDhIQUE4SCxDQUMvSCxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQ1Qsb0dBQW9HLENBQ3JHLENBQUE7SUFDSCxDQUFDO0NBQ0Y7QUFaRCwwREFZQyJ9