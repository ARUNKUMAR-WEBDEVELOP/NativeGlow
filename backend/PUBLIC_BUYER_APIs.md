# NativeGlow Public Buyer APIs

## Overview
5 public APIs for customers to browse vendors, search products, and view categories. **NO authentication required**.

All APIs filter for **approved vendors** (is_active=True, is_approved=True) and **approved products** (status='approved', available_quantity>0).

---

## 1. Store Vendor Page
**GET /api/products/store/{vendor_slug}/**

Browse a single vendor's public store with all their approved products.

### Request
```bash
GET /api/products/store/green-botanicals/
```

### Success Response (200 OK)
```json
{
  "business_name": "Green Botanicals",
  "city": "Bangalore",
  "whatsapp_number": "919876543210",
  "total_products": 12,
  "member_since": 2023,
  "products": [
    {
      "id": 42,
      "name": "Herbal Face Wash",
      "slug": "herbal-face-wash",
      "description": "100% natural herbal face wash",
      "price": "199.00",
      "available_quantity": 45,
      "is_natural_certified": true,
      "category_name": "Face Wash",
      "vendor_slug": "green-botanicals",
      "primary_image": "https://nativeglow.com/media/products/face-wash.jpg"
    },
    ...
  ]
}
```

### Error Responses
- **404 Not Found**: Vendor not found
  ```json
  {"detail": "Store not found."}
  ```
- **403 Forbidden**: Vendor is inactive/suspended
  ```json
  {"detail": "This store is currently unavailable."}
  ```

---

## 2. Public Product Detail
**GET /api/products/store/{vendor_slug}/products/{product_id}/**

Get full product details with vendor payment information (WhatsApp, UPI).

### Request
```bash
GET /api/products/store/green-botanicals/products/42/
```

### Success Response (200 OK)
```json
{
  "id": 42,
  "name": "Herbal Face Wash",
  "slug": "herbal-face-wash",
  "description": "Premium 100% natural herbal face wash with neem and turmeric...",
  "price": "199.00",
  "available_quantity": 45,
  "is_natural_certified": true,
  "ingredients": "Neem, Turmeric, Aloe Vera, Rose Water",
  "ingredients_list": ["Neem", "Turmeric", "Aloe Vera", "Rose Water"],
  "category_name": "Face Wash",
  "vendor_business_name": "Green Botanicals",
  "vendor_whatsapp": "919876543210",
  "vendor_upi": "greenbot@upi",
  "images": [
    {
      "id": 1,
      "image_url": "https://nativeglow.com/media/products/face-wash-1.jpg",
      "alt_text": "Face Wash Front View",
      "position": 1
    }
  ],
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Error Response
- **404 Not Found**: Product not found, not approved, or vendor mismatches
  ```json
  {"detail": "Product not found or unavailable."}
  ```

---

## 3. Store Global Search
**GET /api/products/store/search/**

Search across all vendors for products by name, category, or location.

### Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search term (matches product name/description) |
| category | string | Filter by category name |
| city | string | Filter by vendor city |

### Examples
```bash
# Search by product name
GET /api/products/store/search/?q=face+wash

# Filter by category
GET /api/products/store/search/?category=soap

# Filter by vendor city
GET /api/products/store/search/?city=Bangalore

# Combine filters
GET /api/products/store/search/?q=organic&category=skincare&city=Chennai
```

### Response (200 OK)
```json
{
  "count": 3,
  "results": [
    {
      "id": 42,
      "name": "Herbal Face Wash",
      "slug": "herbal-face-wash",
      "description": "...",
      "price": "199.00",
      "available_quantity": 45,
      "is_natural_certified": true,
      "category_name": "Face Wash",
      "vendor_slug": "green-botanicals",
      "primary_image": "https://nativeglow.com/media/products/face-wash.jpg"
    },
    ...
  ]
}
```

### Search Behavior
- **Limit**: Maximum 50 results
- **Sorting**: By creation date (newest first)
- **Filters Applied**:
  - Product status = 'approved'
  - Product is_active = True
  - Product available_quantity > 0
  - Vendor is_approved = True
  - Vendor is_active = True

---

## 4. Store Categories with Count
**GET /api/products/store/categories/**

Get all product categories with count of available products (for homepage category browse).

### Request
```bash
GET /api/products/store/categories/
```

### Response (200 OK)
```json
[
  {
    "category": "Face Wash",
    "count": 12
  },
  {
    "category": "Soap",
    "count": 8
  },
  {
    "category": "Serum",
    "count": 5
  },
  {
    "category": "Hair Oil",
    "count": 15
  },
  ...
]
```

### Notes
- **Empty categories excluded**: Only categories with available products shown
- **Ordering**: Alphabetical by category name
- **Count**: Number of approved, available products from active vendors

---

## 5. Store Featured Products
**GET /api/products/store/featured/**

Get 8 most-ordered products (for homepage featured section).

### Request
```bash
GET /api/products/store/featured/
```

### Response (200 OK)
```json
[
  {
    "id": 42,
    "name": "Herbal Face Wash",
    "slug": "herbal-face-wash",
    "description": "100% natural herbal face wash",
    "price": "199.00",
    "available_quantity": 45,
    "is_natural_certified": true,
    "category_name": "Face Wash",
    "vendor_slug": "green-botanicals",
    "primary_image": "https://nativeglow.com/media/products/face-wash.jpg"
  },
  ...max 8 products...
]
```

### Sorting
1. By order count (descending - most ordered first)
2. By creation date (descending - newest first)

---

## Data Model

### Product Fields
Common fields returned in all product responses:
```
id, name, slug, description, price, available_quantity, is_natural_certified,
category_name, vendor_slug, primary_image
```

### Vendor Fields
```
business_name, city, whatsapp_number, total_products, member_since, 
vendor_whatsapp (payment), vendor_upi (payment)
```

---

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid query params) |
| 404 | Resource not found |
| 403 | Forbidden (inactive vendor/product) |
| 500 | Server error |

---

## Implementation Details

### Frontend Usage Example
```javascript
// Browse vendor store
const response = await fetch('/api/products/store/green-botanicals/');
const storeData = await response.json();

// Search for products
const searchResponse = await fetch('/api/products/store/search/?q=face+wash');
const searchResults = await searchResponse.json();

// Get categories for homepage
const categoriesResponse = await fetch('/api/products/store/categories/');
const categories = await categoriesResponse.json();

// Get featured products
const featuredResponse = await fetch('/api/products/store/featured/');
const featured = await featuredResponse.json();
```

### Database Queries Optimized
- Vendor lookups: Indexed on `is_approved`, `is_active`
- Product filters: Use select_related for category + vendor
- Category counts: Annotated with Count() to reduce queries

---

## Security Notes
- ✅ No authentication required (public APIs)
- ✅ Only approved vendors and products exposed
- ✅ UPI/WhatsApp shown only for active vendors
- ✅ Filters ensure unavailable/suspended stores not accessible
- ✅ Max 50 results per search to prevent abuse
