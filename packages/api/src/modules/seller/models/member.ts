import { model } from "@medusajs/framework/utils"
import Seller from "./seller"
import SellerMember from "./seller-member"
import { MemberRole } from "../../../types/seller"

const Member = model
  .define("Member", {
    id: model.id({ prefix: "mem" }).primaryKey(),
    email: model.text().searchable(),
    locale: model.text().nullable(),
    is_active: model.boolean().default(true),
    role: model.enum(MemberRole).default(MemberRole.OWNER),
    name: model.text().searchable(),
    bio: model.text().searchable().nullable(),
    phone: model.text().searchable().nullable(),
    photo: model.text().nullable(),
    sellers: model.manyToMany(() => Seller, {
      mappedBy: "members",
      pivotEntity: () => SellerMember,
    }),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default Member
