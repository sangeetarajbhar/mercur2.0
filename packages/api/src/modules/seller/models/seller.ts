import { model } from "@medusajs/framework/utils";
import { MemberInvite } from "./invite";
import { Member } from "./member";
import { SellerOnboarding } from "./onboarding";
import { CompanySpoc } from "./company-spocs";
import { KycDocument } from "./kyc-document";
import { BankDetail } from "./bank-details";
import { StoreStatus } from "../../../types/seller";

export const Seller = model.define("seller", {
  id: model.id({ prefix: "sel" }).primaryKey(),
  store_status: model.enum(StoreStatus).default(StoreStatus.ACTIVE),
  name: model.text().searchable(),
  handle: model.text().unique(),
  description: model.text().searchable().nullable(),
  photo: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  address_line: model.text().nullable(),
  city: model.text().nullable(),
  state: model.text().nullable(),
  postal_code: model.text().nullable(),
  country_code: model.text().nullable(),
  tax_id: model.text().nullable(),

  display_name: model.text().nullable(),
  barcode: model.text().unique().nullable(),
  entity_type: model.enum(['PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP']).nullable(),
  msme: model.boolean().nullable(),
  seller_type: model.enum(['BRAND', 'SELLER', 'DISTRIBUTOR']).nullable(),

  members: model.hasMany(() => Member),
  invites: model.hasMany(() => MemberInvite),
  onboarding: model.hasOne(() => SellerOnboarding).nullable(),
  company_spocs: model.hasMany(() => CompanySpoc),
  kyc_documents: model.hasMany(() => KycDocument),
  bank_detail: model.hasOne(() => BankDetail).nullable(),
});
