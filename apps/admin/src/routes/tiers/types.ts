export interface TierRule {
  id: string;
  tier_id: string;
  min_purchase_value: number;
  currency_code: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Tier {
  id: string;
  name: string;
  promo_id?: string | null;
  tier_rules?: TierRule[];
  promotion?: {
    id: string;
    code: string;
    status: string;
  } | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateTierRequest {
  name: string;
  promo_id?: string | null;
  tier_rules?: Array<{
    min_purchase_value: number;
    currency_code: string;
  }>;
}

export interface UpdateTierRequest {
  name?: string;
  promo_id?: string | null;
}

export type TiersResponse = {
  tiers?: Tier[];
  isLoading: boolean;
};
