import { defaultAdminCustomerGroupFields } from '@medusajs/medusa/api/admin/customer-groups/query-config'
import { defaultAdminOrderFields } from '@medusajs/medusa/api/admin/orders/query-config'

/** Fields valid on the `seller` graph entity (see modules/seller/models/seller.ts). */
export const adminSellerFields = [
  "id",
  "name",
  "handle",
  "description",
  "email",
  "currency_code",
  "status",
  "status_reason",
  "logo",
  "banner",
  "website_url",
  "external_id",
  "display_name",
  "barcode",
  "entity_type",
  "msme",
  "seller_type",
  "created_at",
  "updated_at",
  "deleted_at",
  "address.*",
  "professional_details.*",
  "members.*",
  "company_spocs.*",
  "kyc_documents.*",
  "bank_detail.*",
]

export const adminSellerQueryConfig = {
  list: {
    defaults: adminSellerFields,
    isList: true
  },
  retrieve: {
    defaults: adminSellerFields,
    isList: false
  }
}

export const adminSellerOrdersQueryConfig = {
  list: {
    defaults: defaultAdminOrderFields,
    isList: true
  },
  retrieve: {
    defaults: defaultAdminOrderFields,
    isList: false
  }
}

export const adminSellerCustomerGroupsQueryConfig = {
  list: {
    defaults: defaultAdminCustomerGroupFields,
    isList: true
  },
  retrieve: {
    defaults: defaultAdminCustomerGroupFields,
    isList: false
  }
}
