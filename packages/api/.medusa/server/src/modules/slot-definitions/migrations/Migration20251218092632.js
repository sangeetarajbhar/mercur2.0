"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20251218092632 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20251218092632 extends migrations_1.Migration {
    async up() {
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slot_definition_zone_time" ON "slot_definition" ("zone_id", "start_time", "end_time") WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop index if exists "UQ_slot_definition_zone_time";`);
    }
}
exports.Migration20251218092632 = Migration20251218092632;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTEyMTgwOTI2MzIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zbG90LWRlZmluaXRpb25zL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNTEyMTgwOTI2MzIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseUVBQW9FO0FBRXBFLE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsTUFBTSxDQUNULHVKQUF1SixDQUN4SixDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsc0RBQXNELENBQUMsQ0FBQTtJQUNyRSxDQUFDO0NBQ0Y7QUFWRCwwREFVQyJ9