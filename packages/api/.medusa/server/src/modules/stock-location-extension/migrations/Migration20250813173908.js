"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20250813173908 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20250813173908 extends migrations_1.Migration {
    async up() {
        this.addSql(`ALTER TABLE "stock_location_extension" ADD COLUMN "is_rain" boolean DEFAULT false;`);
    }
    async down() {
        this.addSql(`ALTER TABLE "stock_location_extension" DROP COLUMN "is_rain";`);
    }
}
exports.Migration20250813173908 = Migration20250813173908;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNTA4MTMxNzM5MDguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zdG9jay1sb2NhdGlvbi1leHRlbnNpb24vbWlncmF0aW9ucy9NaWdyYXRpb24yMDI1MDgxMzE3MzkwOC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBaUQ7QUFFakQsTUFBYSx1QkFBd0IsU0FBUSxzQkFBUztJQUMzQyxLQUFLLENBQUMsRUFBRTtRQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsb0ZBQW9GLENBQUMsQ0FBQTtJQUNuRyxDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUk7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQywrREFBK0QsQ0FBQyxDQUFBO0lBQzlFLENBQUM7Q0FDRjtBQVJELDBEQVFDIn0=