import { Migration } from '@mikro-orm/migrations';

export class Migration20250630014026 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" alter column "seller_ids" type text[] using ("seller_ids"::text[]);`);
    this.addSql(`alter table if exists "promotion_extension" alter column "seller_ids" set default '{}';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" alter column "seller_ids" drop default;`);
    this.addSql(`alter table if exists "promotion_extension" alter column "seller_ids" type text[] using ("seller_ids"::text[]);`);
  }

}

