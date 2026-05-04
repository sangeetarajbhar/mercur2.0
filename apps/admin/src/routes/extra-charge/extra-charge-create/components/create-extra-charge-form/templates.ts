export const templates = [
  {
    id: 'standard',
    title: 'Standard Extra Charge',
    description: 'A basic extra charge that can be applied to orders',
    defaults: { status: 'active', amount: 0 },
    hiddenFields: [],
  },
  {
    id: 'conditional',
    title: 'Conditional Extra Charge',
    description: 'Extra charge with specific conditions and rules',
    defaults: { status: 'active', amount: 0 },
    hiddenFields: [],
  },
  {
    id: 'region_based',
    title: 'Region-Based Extra Charge',
    description: 'Extra charge that varies by customer region',
    defaults: { status: 'active', amount: 0 },
    hiddenFields: [],
  },
  {
    id: 'category_based',
    title: 'Category-Based Extra Charge',
    description: 'Extra charge based on product categories',
    defaults: { status: 'active', amount: 0 },
    hiddenFields: [],
  },
]
