import { Migration } from '@mikro-orm/migrations';

export class Migration20250729142538 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "bank_detail" drop constraint if exists "bank_detail_seller_id_unique";`);
    this.addSql(`create table if not exists "kyc_document" ("id" text not null, "kyc_type" text check ("kyc_type" in ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'OTHERS')) not null, "value" text not null, "file_url" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kyc_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_seller_id" ON "kyc_document" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_deleted_at" ON "kyc_document" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "company_spoc" ("id" text not null, "contact_person" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "type" text check ("type" in ('Primary', 'Secondary')) not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_spoc_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_seller_id" ON "company_spoc" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_deleted_at" ON "company_spoc" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand_association" ("id" text not null, "brand_id" text not null, "brand_name" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_association_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_association_seller_id" ON "brand_association" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_association_deleted_at" ON "brand_association" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "bank_detail" ("id" text not null, "account_number" text not null, "ifsc_code" text not null, "bank_name" text not null, "branch_name" text not null, "account_type" text check ("account_type" in ('SAVINGS', 'CURRENT')) not null, "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) not null, "account_verified" boolean not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bank_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bank_detail_seller_id_unique" ON "bank_detail" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_bank_detail_deleted_at" ON "bank_detail" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "kyc_document" add constraint "kyc_document_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "company_spoc" add constraint "company_spoc_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "brand_association" add constraint "brand_association_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "bank_detail" add constraint "bank_detail_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`drop table if exists "seller_bank_detail" cascade;`);

    this.addSql(`drop table if exists "seller_brand_association" cascade;`);

    this.addSql(`drop table if exists "seller_company_spoc" cascade;`);

    this.addSql(`drop table if exists "seller_kyc_document" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "seller_bank_detail" ("id" text not null, "account_number" text not null, "ifsc_code" text not null, "bank_name" text not null, "branch_name" text not null, "account_type" text check ("account_type" in ('SAVINGS', 'CURRENT')) not null, "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) not null, "account_verified" boolean not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_bank_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_bank_detail_seller_id_unique" ON "seller_bank_detail" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_bank_detail_deleted_at" ON "seller_bank_detail" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_brand_association" ("id" text not null, "brand_id" text not null, "brand_name" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_brand_association_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_brand_association_seller_id" ON "seller_brand_association" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_brand_association_deleted_at" ON "seller_brand_association" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_company_spoc" ("id" text not null, "contact_person" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "type" text check ("type" in ('Primary', 'Secondary')) not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_company_spoc_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_company_spoc_seller_id" ON "seller_company_spoc" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_company_spoc_deleted_at" ON "seller_company_spoc" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_kyc_document" ("id" text not null, "kyc_type" text check ("kyc_type" in ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'OTHERS')) not null, "value" text not null, "file_url" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_kyc_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_kyc_document_seller_id" ON "seller_kyc_document" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_kyc_document_deleted_at" ON "seller_kyc_document" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "seller_bank_detail" add constraint "seller_bank_detail_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "seller_brand_association" add constraint "seller_brand_association_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "seller_company_spoc" add constraint "seller_company_spoc_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`alter table if exists "seller_kyc_document" add constraint "seller_kyc_document_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    this.addSql(`drop table if exists "kyc_document" cascade;`);

    this.addSql(`drop table if exists "company_spoc" cascade;`);

    this.addSql(`drop table if exists "brand_association" cascade;`);

    this.addSql(`drop table if exists "bank_detail" cascade;`);
  }

}
