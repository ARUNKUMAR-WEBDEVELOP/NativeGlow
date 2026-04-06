export const PRODUCT_TYPE_OPTIONS = [
  { value: 'skincare', label: 'Beauty & Skincare' },
  { value: 'bodycare', label: 'Body & Wellness' },
  { value: 'cosmetics', label: 'Cosmetics & Makeup' },
  { value: 'clothing', label: 'Clothing & Apparel' },
  { value: 'food', label: 'Food & Snacks' },
  { value: 'grocery', label: 'Groceries & Essentials' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home & Lifestyle' },
];

export const CATEGORY_TYPE_OPTIONS = [
  { value: 'face_wash', label: 'Face Wash' },
  { value: 'soap', label: 'Soap' },
  { value: 'serum', label: 'Serum' },
  { value: 'moisturizer', label: 'Moisturizer' },
  { value: 'hair_oil', label: 'Hair Oil' },
  { value: 'body_lotion', label: 'Body Lotion' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_PRODUCT_TYPE_MAP = {
  face_wash: 'skincare',
  soap: 'skincare',
  serum: 'skincare',
  moisturizer: 'skincare',
  hair_oil: 'bodycare',
  body_lotion: 'bodycare',
  cosmetics: 'cosmetics',
  clothing: 'clothing',
  snacks: 'food',
  groceries: 'grocery',
  accessories: 'accessories',
  other: 'home',
};

const COMMON_FIELDS = [
  {
    name: 'brand_name',
    label: 'Brand Name',
    type: 'text',
    placeholder: 'NativeGlow',
    required: true,
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer / Packager',
    type: 'text',
    placeholder: 'Vendor or production partner name',
  },
  {
    name: 'country_of_origin',
    label: 'Country of Origin',
    type: 'text',
    placeholder: 'India',
  },
  {
    name: 'package_contains',
    label: 'Package Contains',
    type: 'text',
    placeholder: '1 bottle, 2 refills, size chart',
  },
];

const TEMPLATE_FIELDS = {
  skincare: [
    {
      name: 'skin_type',
      label: 'Skin Type',
      type: 'select',
      options: ['All Skin Types', 'Dry', 'Oily', 'Combination', 'Sensitive'],
    },
    {
      name: 'concern',
      label: 'Target Concern',
      type: 'text',
      placeholder: 'Hydration, acne, glow, pigmentation',
    },
    {
      name: 'net_volume',
      label: 'Net Volume / Weight',
      type: 'text',
      placeholder: '30 ml',
    },
    {
      name: 'usage_instructions',
      label: 'Usage Instructions',
      type: 'textarea',
      placeholder: 'Apply on clean skin, use twice daily...',
    },
    {
      name: 'expiry_months',
      label: 'Shelf Life (Months)',
      type: 'number',
      placeholder: '12',
    },
  ],
  bodycare: [
    {
      name: 'body_area',
      label: 'Body Area',
      type: 'text',
      placeholder: 'Face, body, hands, feet',
    },
    {
      name: 'fragrance_profile',
      label: 'Fragrance Profile',
      type: 'text',
      placeholder: 'Herbal, citrus, unscented',
    },
    {
      name: 'net_volume',
      label: 'Net Volume / Weight',
      type: 'text',
      placeholder: '100 ml',
    },
    {
      name: 'usage_instructions',
      label: 'Usage Instructions',
      type: 'textarea',
      placeholder: 'Massage onto body after shower...',
    },
  ],
  cosmetics: [
    {
      name: 'shade',
      label: 'Shade / Tone',
      type: 'text',
      placeholder: 'Natural beige, rose pink',
    },
    {
      name: 'finish',
      label: 'Finish',
      type: 'select',
      options: ['Matte', 'Dewy', 'Glossy', 'Natural'],
    },
    {
      name: 'skin_type',
      label: 'Skin Type',
      type: 'select',
      options: ['All Skin Types', 'Dry', 'Oily', 'Combination', 'Sensitive'],
    },
    {
      name: 'cruelty_free',
      label: 'Cruelty Free',
      type: 'checkbox',
    },
    {
      name: 'vegan',
      label: 'Vegan',
      type: 'checkbox',
    },
    {
      name: 'expiry_months',
      label: 'Shelf Life (Months)',
      type: 'number',
      placeholder: '24',
    },
  ],
  clothing: [
    {
      name: 'gender',
      label: 'Target Audience',
      type: 'select',
      options: ['Men', 'Women', 'Unisex', 'Kids'],
    },
    {
      name: 'size_chart',
      label: 'Size Chart',
      type: 'text',
      placeholder: 'S, M, L, XL',
    },
    {
      name: 'material',
      label: 'Material',
      type: 'text',
      placeholder: 'Cotton, linen, blend',
    },
    {
      name: 'fit',
      label: 'Fit',
      type: 'select',
      options: ['Regular', 'Slim', 'Relaxed', 'Oversized'],
    },
    {
      name: 'color',
      label: 'Color',
      type: 'text',
      placeholder: 'Olive green',
    },
    {
      name: 'care_instructions',
      label: 'Care Instructions',
      type: 'textarea',
      placeholder: 'Machine wash cold, do not bleach...',
    },
  ],
  food: [
    {
      name: 'flavor',
      label: 'Flavor / Variety',
      type: 'text',
      placeholder: 'Spicy, chocolate, classic',
    },
    {
      name: 'net_weight',
      label: 'Net Weight',
      type: 'text',
      placeholder: '250 g',
    },
    {
      name: 'shelf_life_months',
      label: 'Shelf Life (Months)',
      type: 'number',
      placeholder: '6',
    },
    {
      name: 'vegetarian',
      label: 'Vegetarian',
      type: 'checkbox',
    },
    {
      name: 'allergen_info',
      label: 'Allergen Information',
      type: 'textarea',
      placeholder: 'May contain nuts, dairy, soy...',
    },
    {
      name: 'storage_instructions',
      label: 'Storage Instructions',
      type: 'textarea',
      placeholder: 'Store in a cool, dry place...',
    },
  ],
  grocery: [
    {
      name: 'product_subtype',
      label: 'Product Subtype',
      type: 'select',
      options: ['Staples', 'Pulses', 'Spices', 'Flour', 'Dry Fruits', 'Beverages', 'Other'],
    },
    {
      name: 'net_weight',
      label: 'Net Weight',
      type: 'text',
      placeholder: '1 kg',
    },
    {
      name: 'shelf_life_months',
      label: 'Shelf Life (Months)',
      type: 'number',
      placeholder: '9',
    },
    {
      name: 'allergen_info',
      label: 'Allergen Information',
      type: 'textarea',
      placeholder: 'Packed in facility that handles nuts and gluten... ',
    },
    {
      name: 'storage_instructions',
      label: 'Storage Instructions',
      type: 'textarea',
      placeholder: 'Store in airtight container away from moisture... ',
    },
  ],
  accessories: [
    {
      name: 'material',
      label: 'Material',
      type: 'text',
      placeholder: 'Leather, alloy, cotton',
    },
    {
      name: 'color',
      label: 'Color',
      type: 'text',
      placeholder: 'Black, gold, beige',
    },
    {
      name: 'dimensions',
      label: 'Dimensions / Size',
      type: 'text',
      placeholder: 'One size, 24 cm',
    },
    {
      name: 'care_instructions',
      label: 'Care Instructions',
      type: 'textarea',
      placeholder: 'Wipe clean with soft cloth...',
    },
  ],
  home: [
    {
      name: 'material',
      label: 'Material',
      type: 'text',
      placeholder: 'Ceramic, wood, steel',
    },
    {
      name: 'dimensions',
      label: 'Dimensions',
      type: 'text',
      placeholder: '12 x 8 x 4 cm',
    },
    {
      name: 'care_instructions',
      label: 'Care Instructions',
      type: 'textarea',
      placeholder: 'Hand wash, dry thoroughly...',
    },
  ],
};

export function getProductAttributeFields(productType) {
  return [...COMMON_FIELDS, ...(TEMPLATE_FIELDS[productType] || TEMPLATE_FIELDS.skincare)];
}

export function getEmptyProductAttributes(productType) {
  const fields = getProductAttributeFields(productType);
  return fields.reduce((accumulator, field) => {
    if (field.type === 'checkbox') {
      accumulator[field.name] = false;
      return accumulator;
    }
    accumulator[field.name] = '';
    return accumulator;
  }, {});
}

export function sanitizeProductAttributes(productType, attributes) {
  const allowedNames = new Set(getProductAttributeFields(productType).map((field) => field.name));
  return Object.entries(attributes || {}).reduce((accumulator, [key, value]) => {
    if (allowedNames.has(key)) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

const VARIANT_PRESETS = {
  clothing: [
    { option_name: 'Size', option_value: 'M' },
    { option_name: 'Color', option_value: 'Natural' },
  ],
  food: [
    { option_name: 'Pack Size', option_value: '1 Pack' },
    { option_name: 'Flavor', option_value: 'Classic' },
  ],
  grocery: [
    { option_name: 'Pack Size', option_value: '1 kg' },
    { option_name: 'Type', option_value: 'Regular' },
  ],
  cosmetics: [
    { option_name: 'Shade', option_value: 'Natural' },
    { option_name: 'Finish', option_value: 'Matte' },
  ],
  skincare: [
    { option_name: 'Size', option_value: '30 ml' },
  ],
  bodycare: [
    { option_name: 'Size', option_value: '100 ml' },
  ],
  accessories: [
    { option_name: 'Color', option_value: 'Natural' },
  ],
  home: [
    { option_name: 'Size', option_value: 'Standard' },
  ],
};

export function getDefaultVariantRows(productType) {
  return (VARIANT_PRESETS[productType] || [{ option_name: 'Option', option_value: 'Default' }]).map((item) => ({
    option_name: item.option_name,
    option_value: item.option_value,
    sku_suffix: '',
    additional_price: '',
    stock: '',
  }));
}

export function sanitizeVariantRows(rows) {
  return (rows || [])
    .map((row) => ({
      option_name: String(row?.option_name || '').trim(),
      option_value: String(row?.option_value || '').trim(),
      sku_suffix: String(row?.sku_suffix || '').trim(),
      additional_price: row?.additional_price === '' || row?.additional_price === null || row?.additional_price === undefined ? 0 : Number(row.additional_price),
      stock: row?.stock === '' || row?.stock === null || row?.stock === undefined ? 0 : Number(row.stock),
    }))
    .filter((row) => row.option_name && row.option_value);
}

export function formatProductAttributeLabel(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getProductTypeForCategory(categoryType) {
  return CATEGORY_PRODUCT_TYPE_MAP[categoryType] || 'skincare';
}
