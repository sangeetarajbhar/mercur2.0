import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260418065835 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop constraint if exists "seller_barcode_unique";`);
    this.addSql(`alter table if exists "seller_onboarding" drop constraint if exists "seller_onboarding_seller_id_unique";`);
    this.addSql(`alter table if exists "bank_detail" drop constraint if exists "bank_detail_seller_id_unique";`);
    this.addSql(`create table if not exists "kyc_document" ("id" text not null, "kyc_type" text check ("kyc_type" in ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'GST_CERTIFICATE', 'MSME_CERTIFICATE', 'OTHERS')) not null, "value" text not null, "file_url" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kyc_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_seller_id" ON "kyc_document" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_deleted_at" ON "kyc_document" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "company_spoc" ("id" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "type" text check ("type" in ('Primary', 'Secondary')) not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_spoc_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_seller_id" ON "company_spoc" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_deleted_at" ON "company_spoc" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "bank_detail" ("id" text not null, "account_number" text not null, "ifsc_code" text not null, "bank_name" text not null, "branch_name" text not null, "account_type" text check ("account_type" in ('SAVINGS', 'CURRENT')) not null, "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) not null, "account_verified" boolean not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bank_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bank_detail_seller_id_unique" ON "bank_detail" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_bank_detail_deleted_at" ON "bank_detail" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_onboarding" ("id" text not null, "store_information" boolean not null default false, "stripe_connection" boolean not null default false, "locations_shipping" boolean not null default false, "products" boolean not null default false, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_onboarding_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_onboarding_seller_id_unique" ON "seller_onboarding" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_onboarding_deleted_at" ON "seller_onboarding" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "kyc_document" add constraint "kyc_document_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "company_spoc" add constraint "company_spoc_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "bank_detail" add constraint "bank_detail_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "seller_onboarding" add constraint "seller_onboarding_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "seller" add column if not exists "closure_note" text null, add column if not exists "display_name" text null, add column if not exists "barcode" text null, add column if not exists "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) null, add column if not exists "msme" boolean null, add column if not exists "seller_type" text check ("seller_type" in ('BRAND', 'SELLER', 'DISTRIBUTOR')) null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_barcode_unique" ON "seller" ("barcode") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "professional_details" alter column "corporate_name" type text using ("corporate_name"::text);`);
    this.addSql(`alter table if exists "professional_details" alter column "corporate_name" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "kyc_document" cascade;`);

    this.addSql(`drop table if exists "company_spoc" cascade;`);

    this.addSql(`drop table if exists "bank_detail" cascade;`);

    this.addSql(`drop table if exists "seller_onboarding" cascade;`);

    this.addSql(`drop index if exists "IDX_seller_barcode_unique";`);
    this.addSql(`alter table if exists "seller" drop column if exists "closure_note", drop column if exists "display_name", drop column if exists "barcode", drop column if exists "entity_type", drop column if exists "msme", drop column if exists "seller_type";`);

    this.addSql(`alter table if exists "professional_details" alter column "corporate_name" type text using ("corporate_name"::text);`);
    this.addSql(`alter table if exists "professional_details" alter column "corporate_name" set not null;`);
  }

}
