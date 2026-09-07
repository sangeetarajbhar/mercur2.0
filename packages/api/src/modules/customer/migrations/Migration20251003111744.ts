import { Migration } from '@mikro-orm/migrations';

export class Migration20251003111744 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "customer_details" alter column "dob" type timestamptz using ("dob"::timestamptz);`);
    this.addSql(`alter table if exists "customer_details" alter column "dob" drop not null;`);
    this.addSql(`alter table if exists "customer_details" alter column "gender" type text using ("gender"::text);`);
    this.addSql(`alter table if exists "customer_details" alter column "gender" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "customer_details" alter column "dob" type timestamptz using ("dob"::timestamptz);`);
    this.addSql(`alter table if exists "customer_details" alter column "dob" set not null;`);
    this.addSql(`alter table if exists "customer_details" alter column "gender" type text using ("gender"::text);`);
    this.addSql(`alter table if exists "customer_details" alter column "gender" set not null;`);
  }

}
