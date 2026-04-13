import { Migration } from '@mikro-orm/migrations';

export class Migration20250813173908 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "stock_location_extension" ADD COLUMN "is_rain" boolean DEFAULT false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "stock_location_extension" DROP COLUMN "is_rain";`);
  }

}
