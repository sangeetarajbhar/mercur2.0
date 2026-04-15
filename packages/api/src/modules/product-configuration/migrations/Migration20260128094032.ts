import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260128094032 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "is_returnable" type boolean using ("is_returnable"::boolean);`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_returnable" set default false;`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_exchangeable" type boolean using ("is_exchangeable"::boolean);`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_exchangeable" set default false;`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_try_and_buy" type boolean using ("is_try_and_buy"::boolean);`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_try_and_buy" set default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "is_returnable" drop default;`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_returnable" type boolean using ("is_returnable"::boolean);`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_exchangeable" drop default;`);
    this.addSql(`alter table if exists "product_configuration" alter column "is_exchangeable" type boolean using ("is_exchangeable"::boolean);`);
  }

}
