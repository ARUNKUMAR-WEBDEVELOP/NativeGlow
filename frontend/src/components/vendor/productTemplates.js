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
      name: 'product_form',
      label: 'Product Form',
      type: 'select',
      options: ['Cream', 'Gel', 'Lotion', 'Face Wash', 'Serum', 'Balm'],
    },
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
      name: 'texture_or_finish',
      label: 'Texture / Finish',
      type: 'text',
      placeholder: 'Cream, light, rich, matte, glossy',
    },
    {
      name: 'net_volume',
      label: 'Net Volume / Weight',
      type: 'text',
      placeholder: '30 ml, 50 g',
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
      name: 'garment_type',
      label: 'Garment Type',
      type: 'select',
      options: [
        'Shirt',
        'T-Shirt',
        'Pants',
        'Track Pants',
        'Trousers',
        'Saree',
        'Kurti',
        'Blouse',
        'Top',
        'Dress',
        'Leggings',
        'Hoodie',
      ],
    },
    {
      name: 'size_chart',
      label: 'Size Chart / Size Numbers',
      type: 'text',
      placeholder: 'S, M, L, XL or 28, 30, 32, 34',
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
      label: 'Color / Print',
      type: 'text',
      placeholder: 'Olive green, black, printed, blue',
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
    { option_name: 'Size', option_value: 'S' },
    { option_name: 'Size', option_value: 'M' },
    { option_name: 'Size', option_value: 'L' },
    { option_name: 'Size', option_value: 'XL' },
  ],
  food: [
    { option_name: 'Pack Size', option_value: '1 Pack' },
    { option_name: 'Flavor', option_value: 'Classic' },
    { option_name: 'Flavor', option_value: 'Spicy' },
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
    { option_name: 'Size', option_value: '50 ml' },
    { option_name: 'Texture', option_value: 'Cream' },
  ],
  bodycare: [
    { option_name: 'Size', option_value: '100 ml' },
    { option_name: 'Size', option_value: '200 ml' },
  ],
  accessories: [
    { option_name: 'Color', option_value: 'Natural' },
    { option_name: 'Size', option_value: 'One Size' },
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
    image_positions: [],
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
      image_positions: Array.isArray(row?.image_positions)
        ? row.image_positions
            .map((position) => Number(position))
            .filter((position) => Number.isInteger(position) && position > 0)
        : [],
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

export function getProductTypeGuide(productType) {
  switch (productType) {
    case 'clothing':
      return 'Use men or women, garment type, size chart, color, fit, and material. Add one variant row for each size or color option.';
    case 'food':
      return 'Use flavor, pack size, shelf life, allergen info, and storage instructions. Add a variant row for each flavor or pack size.';
    case 'cosmetics':
      return 'Use shade, finish, skin type, and expiry details. Add variants for shades and finishes.';
    case 'accessories':
      return 'Use material, color, and dimensions. Add variants for size or color choices.';
    case 'bodycare':
      return 'Use fragrance profile, body area, and volume. Add variants for size options like 100 ml and 200 ml.';
    case 'skincare':
    default:
      return 'Use product form, skin type, concern, texture, and net volume. Add variants for cream size, pack size, or finish.';
  }
}

export function getVariantPresetHelp(productType) {
  switch (productType) {
    case 'clothing':
      return 'Recommended variants: Size S, M, L, XL. Add separate color rows if the same item comes in multiple colors.';
    case 'food':
      return 'Recommended variants: flavor and pack size.';
    case 'cosmetics':
      return 'Recommended variants: shade and finish.';
    case 'accessories':
      return 'Recommended variants: size and color.';
    case 'bodycare':
    case 'skincare':
    default:
      return 'Recommended variants: size, texture, or pack size.';
  }
}

const CLOTHING_SIZES_BY_AUDIENCE_AND_GARMENT = {
  men: {
    Shirt: ['S', 'M', 'L', 'XL', 'XXL'],
    'T-Shirt': ['S', 'M', 'L', 'XL', 'XXL'],
    Pants: ['28', '30', '32', '34', '36', '38', '40'],
    Trousers: ['28', '30', '32', '34', '36', '38', '40'],
    'Track Pants': ['S', 'M', 'L', 'XL', 'XXL'],
    Hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  women: {
    Saree: ['5.5 Meter', '6.3 Meter', 'Free Size'],
    Blouse: ['30', '32', '34', '36', '38', '40'],
    Kurti: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Dress: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Leggings: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  unisex: {
    Shirt: ['S', 'M', 'L', 'XL', 'XXL'],
    'T-Shirt': ['S', 'M', 'L', 'XL', 'XXL'],
    Hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  kids: {
    Shirt: ['2Y', '4Y', '6Y', '8Y', '10Y', '12Y'],
    'T-Shirt': ['2Y', '4Y', '6Y', '8Y', '10Y', '12Y'],
    Pants: ['2Y', '4Y', '6Y', '8Y', '10Y', '12Y'],
    Dress: ['2Y', '4Y', '6Y', '8Y', '10Y', '12Y'],
  },
};

function normalizeAudience(value) {
  return String(value || '').trim().toLowerCase();
}

export function getClothingVariantRows(targetAudience, garmentType) {
  const audience = normalizeAudience(targetAudience);
  const garment = String(garmentType || '').trim();
  if (!garment) {
    return [];
  }

  const audienceMap = CLOTHING_SIZES_BY_AUDIENCE_AND_GARMENT[audience] || {};
  const defaultMap = {
    Shirt: ['S', 'M', 'L', 'XL'],
    'T-Shirt': ['S', 'M', 'L', 'XL'],
    Pants: ['28', '30', '32', '34', '36'],
    Saree: ['5.5 Meter', '6.3 Meter', 'Free Size'],
    Kurti: ['S', 'M', 'L', 'XL'],
    Top: ['S', 'M', 'L', 'XL'],
    Dress: ['S', 'M', 'L', 'XL'],
    Leggings: ['S', 'M', 'L', 'XL'],
    Hoodie: ['S', 'M', 'L', 'XL'],
  };

  const sizes = audienceMap[garment] || defaultMap[garment] || [];
  return sizes.map((size) => ({
    option_name: 'Size',
    option_value: size,
    image_positions: [],
  }));
}

// ============================================================================
// SIZE OPTIONS BY CATEGORY
// ============================================================================

export const CATEGORY_SIZE_OPTIONS = {
  // Men's Clothing
  shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  t_shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  pants: ['28', '30', '32', '34', '36', '38', '40', '42'],
  trousers: ['28', '30', '32', '34', '36', '38', '40', '42'],
  track_pants: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  hoodie: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  
  // Women's Clothing
  kurti: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  dress: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  leggings: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  
  // Skincare & Beauty - Volume
  face_wash: ['30ml', '50ml', '100ml', '150ml', '200ml'],
  serum: ['15ml', '30ml', '50ml'],
  moisturizer: ['30ml', '50ml', '100ml'],
  hair_oil: ['100ml', '200ml', '500ml'],
  
  // Body Care - Volume
  body_lotion: ['100ml', '200ml', '500ml'],
  soap: ['50g', '75g', '100g', '125g'],
  
  // Cosmetics - Shade/Finish
  cosmetics: ['Light', 'Medium', 'Dark'],
  
  // Accessories
  accessories: ['One Size', 'Free Size'],
  
  // Food & Grocery
  snacks: ['50g', '100g', '150g', '200g', '250g', '500g'],
  groceries: ['250g', '500g', '1kg', '2kg', '5kg'],
  
  // Default
  default: ['One Size'],
};

// ============================================================================
// COMMON COLOR OPTIONS
// ============================================================================

export const COMMON_COLOR_OPTIONS = [
  'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Black', 'White',
  'Grey', 'Maroon', 'Navy', 'Olive', 'Teal', 'Gold', 'Silver', 'Beige', 'Cream', 'Khaki',
  'Turquoise', 'Coral', 'Rose', 'Salmon', 'Peach', 'Lavender', 'Lime', 'Mint', 'Ivory', 'Charcoal',
];

export function getCategoryColorOptions(categoryType) {
  const skinCareColors = ['Natural', 'Fair', 'Medium', 'Tan', 'Deep'];
  const clothingColors = COMMON_COLOR_OPTIONS;
  const foodColors = ['Natural', 'Mild', 'Hot', 'Extra Hot'];
  
  switch (categoryType) {
    case 'cosmetics':
      return ['Fair', 'Light', 'Medium', 'Deep', 'Very Deep'];
    case 'clothing':
    case 'accessories':
      return clothingColors;
    case 'food':
    case 'snacks':
      return foodColors;
    case 'face_wash':
    case 'serum':
    case 'moisturizer':
    case 'soap':
      return skinCareColors;
    default:
      return COMMON_COLOR_OPTIONS;
  }
}

export function getCategorySizeOptions(categoryType) {
  return CATEGORY_SIZE_OPTIONS[categoryType] || CATEGORY_SIZE_OPTIONS.default;
}
