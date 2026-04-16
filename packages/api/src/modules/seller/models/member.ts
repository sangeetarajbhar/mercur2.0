import { model } from "@medusajs/framework/utils";

import { Seller } from "./seller";
import { MemberRole } from "../../../types/seller";

export const Member = model.define("member", {
  id: model.id({ prefix: "mem" }).primaryKey(),
  role: model.enum(MemberRole).default(MemberRole.OWNER),
  name: model.text().searchable(),
  email: model.text().nullable(),
  bio: model.text().searchable().nullable(),
  phone: model.text().searchable().nullable(),
  photo: model.text().nullable(),
  seller: model.belongsTo(() => Seller, { mappedBy: "members" }),
});
