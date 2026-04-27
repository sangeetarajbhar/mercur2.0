# Cart Module

## Overview
The Cart Module provides functionality for applying seller-specific pricing to line items in a cart. It ensures that when a product is added to the cart with a specific seller, the correct seller-specific price is applied.

## Features
- Applies seller-specific pricing to cart line items based on `seller_id` in metadata
- Automatically updates prices when line items are added or updated
- Provides an API endpoint to manually apply seller-specific pricing

## How It Works

### Seller-Specific Pricing Flow
1. When a variant is added to the cart on the frontend, the `seller_id` is included in the line item metadata
2. The middleware intercepts cart line item operations (add/update)
3. After the operation completes, the middleware triggers the price update process
4. The `CartModuleService` looks up the seller-specific price for the variant
5. If a seller-specific price is found, the line item's price is updated

### Database Schema and Pricing Lookup
The pricing lookup process uses the following tables:

1. First, it gets the `price_set_id` from `product_variant_price_set` table using the variant ID
2. Then it gets the `price_list_id` from `seller_seller_pricing_price_list` table using the seller ID
3. Finally, it queries the `price` table using both IDs to get the specific price for that variant from that seller

### API Endpoints
- `POST /store/carts/:id/apply-seller-prices` - Manually apply seller-specific pricing to a cart

## Frontend Integration
The frontend implementation passes the `seller_id` in the line item metadata when adding products to the cart:

```javascript
// Example frontend code for adding item to cart
await sdk.store.cart.createLineItem(
  cart.id,
  {
    variant_id: variantId,
    quantity,
    metadata: sellerId ? { seller_id: sellerId } : undefined,
  },
  {},
  headers
)
```

No additional frontend changes are required as all price adjustments happen on the backend.
