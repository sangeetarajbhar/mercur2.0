import { Migration } from '@mikro-orm/migrations';

export class Migration20250131000000 extends Migration {

  override async up(): Promise<void> {
    // Create tier table
    this.addSql(`create table if not exists "tier" ("id" text not null, "name" text not null, "promo_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tier_pkey" primary key ("id"));`);
    
    // Create tier_rule table
    this.addSql(`create table if not exists "tier_rule" ("id" text not null, "min_purchase_value" numeric not null, "currency_code" text not null, "tier_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tier_rule_pkey" primary key ("id"));`);
    
    // Create foreign key constraint for tier_rule.tier_id
    this.addSql(`alter table "tier_rule" add constraint "tier_rule_tier_id_foreign" foreign key ("tier_id") references "tier" ("id") on update cascade on delete cascade;`);
    
    // Create unique index for tier_rule (tier_id, currency_code)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tier_rule_tier_id_currency_code" ON "tier_rule" (tier_id, currency_code) WHERE deleted_at IS NULL;`);
    
    // Create index for tier.deleted_at
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tier_deleted_at" ON "tier" (deleted_at) WHERE deleted_at IS NULL;`);
    
    // Create index for tier_rule.deleted_at
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tier_rule_deleted_at" ON "tier_rule" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tier_rule" cascade;`);
    this.addSql(`drop table if exists "tier" cascade;`);
  }
}

