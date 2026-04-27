import { defaultAdminCustomerGroupFields } from '@medusajs/medusa/api/admin/customer-groups/query-config'
import { defaultAdminOrderFields } from '@medusajs/medusa/api/admin/orders/query-config'

export const adminSellerFields = [
  'id',
  'name',
  'handle',
  'description',
  'photo',
  'email',
  'phone',
  'address_line',
  'city',
  'state',
  'postal_code',
  'country_code',
  'tax_id',
  'display_name',
  'barcode',
  'entity_type',
  'msme',
  'seller_type',
  'store_status',
  'created_at',
  'updated_at',
  'deleted_at',
  'members.*',
  'company_spocs.*',
  'kyc_documents.*',
  'bank_detail.*'
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
