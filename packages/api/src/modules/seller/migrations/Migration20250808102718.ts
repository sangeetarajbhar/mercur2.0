import { Migration } from '@mikro-orm/migrations';

export class Migration20250808102718 extends Migration {

  override async up(): Promise<void> {
    // this.addSql(`alter table if exists "seller_onboarding" drop constraint if exists "seller_onboarding_seller_id_unique";`);
    // this.addSql(`alter table if exists "bank_detail" drop constraint if exists "bank_detail_seller_id_unique";`);
    // this.addSql(`alter table if exists "seller" drop constraint if exists "seller_handle_unique";`);
    // this.addSql(`create table if not exists "seller" ("id" text not null, "store_status" text check ("store_status" in ('ACTIVE', 'INACTIVE', 'SUSPENDED')) not null default 'SUSPENDED', "name" text not null, "handle" text not null, "description" text null, "photo" text null, "email" text null, "phone" text null, "address_line" text null, "city" text null, "state" text null, "postal_code" text null, "country_code" text null, "tax_id" text null, "display_name" text null, "barcode_auto_generate" text null, "barcode" text null, "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) null, "msme" boolean null, "seller_type" text check ("seller_type" in ('BRAND', 'SELLER', 'DISTRIBUTOR')) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_pkey" primary key ("id"));`);
    // this.addSql(`alter table if exists "seller" add column if not exists "store_status" text check ("store_status" in ('ACTIVE', 'INACTIVE', 'SUSPENDED')) not null default 'ACTIVE';`);

    // this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_handle_unique" ON "seller" (handle) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_deleted_at" ON "seller" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "member_invite" ("id" text not null, "email" text not null, "role" text check ("role" in ('owner', 'admin', 'member')) not null default 'owner', "seller_id" text not null, "token" text not null, "expires_at" timestamptz not null, "accepted" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "member_invite_pkey" primary key ("id"));`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_member_invite_seller_id" ON "member_invite" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_member_invite_deleted_at" ON "member_invite" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "member" ("id" text not null, "role" text check ("role" in ('owner', 'admin', 'member')) not null default 'owner', "name" text not null, "email" text null, "bio" text null, "phone" text null, "photo" text null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "member_pkey" primary key ("id"));`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_member_seller_id" ON "member" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_member_deleted_at" ON "member" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "kyc_document" ("id" text not null, "kyc_type" text check ("kyc_type" in ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'OTHERS')) not null, "value" text not null, "file_url" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kyc_document_pkey" primary key ("id"));`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_seller_id" ON "kyc_document" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kyc_document_deleted_at" ON "kyc_document" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "company_spoc" ("id" text not null, "contact_person" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "type" text check ("type" in ('Primary', 'Secondary')) not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_spoc_pkey" primary key ("id"));`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_seller_id" ON "company_spoc" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_spoc_deleted_at" ON "company_spoc" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "bank_detail" ("id" text not null, "account_number" text not null, "ifsc_code" text not null, "bank_name" text not null, "branch_name" text not null, "account_type" text check ("account_type" in ('SAVINGS', 'CURRENT')) not null, "entity_type" text check ("entity_type" in ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) not null, "account_verified" boolean not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bank_detail_pkey" primary key ("id"));`);
    // this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bank_detail_seller_id_unique" ON "bank_detail" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_bank_detail_deleted_at" ON "bank_detail" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`create table if not exists "seller_onboarding" ("id" text not null, "store_information" boolean not null default false, "stripe_connection" boolean not null default false, "locations_shipping" boolean not null default false, "products" boolean not null default false, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_onboarding_pkey" primary key ("id"));`);
    // this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_onboarding_seller_id_unique" ON "seller_onboarding" (seller_id) WHERE deleted_at IS NULL;`);
    // this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_onboarding_deleted_at" ON "seller_onboarding" (deleted_at) WHERE deleted_at IS NULL;`);

    // this.addSql(`alter table if exists "member_invite" add constraint "member_invite_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    // this.addSql(`alter table if exists "member" add constraint "member_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    // this.addSql(`alter table if exists "kyc_document" add constraint "kyc_document_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    // this.addSql(`alter table if exists "company_spoc" add constraint "company_spoc_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    // this.addSql(`alter table if exists "bank_detail" add constraint "bank_detail_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);

    // this.addSql(`alter table if exists "seller_onboarding" add constraint "seller_onboarding_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "display_name" text null;`);
    
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "barcode_auto_generate" text null;`);
    
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "barcode" text null;`);
    
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "entity_type" text CHECK ("entity_type" IN ('PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP')) null;`);
    
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "msme" boolean null;`);
    
    this.addSql(`ALTER TABLE IF EXISTS "seller"
      ADD COLUMN IF NOT EXISTS "seller_type" text CHECK ("seller_type" IN ('BRAND', 'SELLER', 'DISTRIBUTOR')) null;`);
  }

  override async down(): Promise<void> {
    // this.addSql(`alter table if exists "member_invite" drop constraint if exists "member_invite_seller_id_foreign";`);

    // this.addSql(`alter table if exists "member" drop constraint if exists "member_seller_id_foreign";`);

    // this.addSql(`alter table if exists "kyc_document" drop constraint if exists "kyc_document_seller_id_foreign";`);

    // this.addSql(`alter table if exists "company_spoc" drop constraint if exists "company_spoc_seller_id_foreign";`);

    // this.addSql(`alter table if exists "bank_detail" drop constraint if exists "bank_detail_seller_id_foreign";`);

    // this.addSql(`alter table if exists "seller_onboarding" drop constraint if exists "seller_onboarding_seller_id_foreign";`);

    // this.addSql(`drop table if exists "seller" cascade;`);

    // this.addSql(`drop table if exists "member_invite" cascade;`);

    // this.addSql(`drop table if exists "member" cascade;`);

    // this.addSql(`drop table if exists "kyc_document" cascade;`);

    // this.addSql(`drop table if exists "company_spoc" cascade;`);

    // this.addSql(`drop table if exists "bank_detail" cascade;`);

    // this.addSql(`drop table if exists "seller_onboarding" cascade;`);
  }

}
