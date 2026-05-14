export type StoreStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | string

export interface SellerMember {
  id: string
  email?: string | null
  name?: string | null
  phone?: string | null
  photo?: string | null
}

export interface Seller {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  description?: string | null
  handle?: string | null
  store_status?: StoreStatus | null
  created_at?: string | Date
  updated_at?: string | Date
  members?: SellerMember[]
}

