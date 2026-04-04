# Vendor Product Management API - Documentation

**Status:** ✅ Complete & Tested  
**Date:** March 23, 2026

## Overview

Comprehensive API for vendors to manage their product inventory. All endpoints are JWT-protected and vendor-scoped (vendors can only access their own products).

## Base URL

```
/api/vendor/products/
```

All endpoints require JWT authentication with valid vendor access token.

---

## Endpoints

### 1. Add Product

**Endpoint:** `POST /api/vendor/products/add/`

**Authentication:** Required (JWT)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
    "title": "Organic Face Wash",
    "name": "Organic Face Wash",
    "description": "A gentle natural face wash with herbal ingredients",
    "short_description": "Natural face wash for daily use",
    "category_type": "face_wash",
    "ingredients": "Neem, Turmeric, Aloe Vera, Rose Water",
    "price": "299.00",
    "available_quantity": 50,
    "image": <binary_image_data>,
    "is_natural_certified": true,
    "sku": "OFWASH-001",
    "tags": "organic,herbal,natural",
    "product_type": "skincare",
    "unit": "ml"
}
```

**Request Validation:**

- `title`: Required, max 200 characters
- `description`: Required, text
- `category_type`: Required, one of: face_wash, soap, serum, toner, moisturizer, other
- `price`: Required, decimal (max 8 digits, 2 decimals)
- `available_quantity`: Required, non-negative integer
- `image`: Optional, image file
- `is_natural_certified`: Optional, boolean (default: False)
- `sku`: Optional, unique per product

**Response (201 Created):**

```json
{
  "id": 1,
  "title": "Organic Face Wash",
  "slug": "organic-face-wash",
  "status": "approved",
  "message": "Product created successfully and is now live in your store."
}
```

**Features:**
✅ Auto-generates unique slug from title  
✅ Sets status to 'approved' for approved active vendors  
✅ Links to logged-in vendor automatically  
✅ Becomes visible in public store immediately (if available)

---

### 2. List Vendor's Products

**Endpoint:** `GET /api/vendor/products/`

**Authentication:** Required (JWT)

**Query Parameters:**
None (returns only authenticated vendor's products)

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "title": "Organic Face Wash",
    "price": "299.00",
    "available_quantity": 50,
    "status": "pending",
    "status_display": "Pending",
    "is_active": true,
    "is_natural_certified": true,
    "created_at": "2026-03-23T10:30:00Z",
    "updated_at": "2026-03-23T10:30:00Z"
  },
  {
    "id": 2,
    "title": "Organic Soap",
    "price": "149.00",
    "available_quantity": 100,
    "status": "approved",
    "status_display": "Approved",
    "is_active": true,
    "is_natural_certified": true,
    "created_at": "2026-03-22T15:20:00Z",
    "updated_at": "2026-03-23T09:15:00Z"
  }
]
```

**Features:**
✅ Returns only vendor's own products  
✅ Sorted by newest first  
✅ Includes approval status  
✅ Shows availability and quantity

---

### 3. Edit Product

**Endpoint:** `PUT /api/vendor/products/<id>/edit/`

**Authentication:** Required (JWT)

**Path Parameters:**

- `id`: Product ID (integer)

**Request Body:**

```json
{
  "title": "Updated Organic Face Wash",
  "description": "Improved description",
  "price": "349.00",
  "available_quantity": 75,
  "ingredients": "Neem, Turmeric, Aloe Vera, Rose Water, Cucumber",
  "is_natural_certified": true
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Updated Organic Face Wash",
  "status": "approved",
  "message": "Product updated successfully."
}
```

**Status Behavior on Edit:**

- Product remains **approved** after vendor edits
- Rejected products clear rejection reason on successful update
- Public store continuity is preserved for active vendors

**Features:**
✅ Only vendor who owns product can edit  
✅ Preserves approved status for storefront continuity  
✅ Prevents unauthorized edits

---

### 4. Delete Product

**Endpoint:** `DELETE /api/vendor/products/<id>/delete/`

**Authentication:** Required (JWT)

**Path Parameters:**

- `id`: Product ID (integer)

**Response (204 No Content):**

```json
{
  "message": "Product deleted successfully"
}
```

**Deletion Restrictions:**

- ❌ Cannot delete if product has active orders (pending, processing, shipped)
- ✅ Can delete if no orders or all orders are completed/cancelled

**Error Response (400 Bad Request):**

```json
{
  "error": "Cannot delete product with active orders. Mark as unavailable instead."
}
```

**Features:**
✅ Checks for active orders before deletion  
✅ Prevents data loss from customer orders  
✅ Only vendor's products can be deleted

---

### 5. Toggle Availability

**Endpoint:** `PATCH /api/vendor/products/<id>/status/`

**Authentication:** Required (JWT)

**Path Parameters:**

- `id`: Product ID (integer)

**Request Body:**

```json
{
  "is_available": false
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Organic Face Wash",
  "is_available": false,
  "message": "Product marked as Unavailable"
}
```

**Use Cases:**

- Out of stock → set `is_available: false`
- Back in stock → set `is_available: true`
- Seasonal products → toggle seasonally

**Features:**
✅ Soft availability toggle (product remains in system)  
✅ Doesn't delete product or orders  
✅ Good for temporary out-of-stock situations

---

### 6. Update Quantity

**Endpoint:** `PATCH /api/vendor/products/<id>/quantity/`

**Authentication:** Required (JWT)

**Path Parameters:**

- `id`: Product ID (integer)

**Request Body:**

```json
{
  "available_quantity": 150
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Organic Face Wash",
  "available_quantity": 150,
  "message": "Quantity updated to 150"
}
```

**Validation:**

- Quantity must be non-negative integer
- Syncs with inventory_qty automatically

**Features:**
✅ Quick quantity updates  
✅ Auto-syncs inventory  
✅ Validates non-negative values

---

## Error Handling

### Authentication Errors

| Status | Response                                                      |
| ------ | ------------------------------------------------------------- |
| 401    | `{"detail": "Authentication credentials were not provided."}` |
| 401    | `{"detail": "Token is invalid or expired"}`                   |

### Product Not Found

| Status | Response                         |
| ------ | -------------------------------- |
| 404    | `{"error": "Product not found"}` |

### Validation Errors

| Status | Response                                             |
| ------ | ---------------------------------------------------- |
| 400    | `{"error": "Invalid or missing vendor ID in token"}` |
| 400    | `{"error": "Quantity must be non-negative"}`         |
| 400    | `{"error": "is_available field is required"}`        |

### Operation Errors

| Status | Response                                                                              |
| ------ | ------------------------------------------------------------------------------------- |
| 400    | `{"error": "Cannot delete product with active orders. Mark as unavailable instead."}` |

---

## Usage Examples

### Example 1: Add a Product (cURL)

```bash
curl -X POST http://localhost:8000/api/vendor/products/add/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Organic Soap",
    "description": "Natural handmade soap",
    "category_type": "soap",
    "price": "149.00",
    "available_quantity": 100,
    "is_natural_certified": true,
    "sku": "SOAP-001"
  }'
```

### Example 2: List Products (Python)

```python
import requests

headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get(
    'http://localhost:8000/api/vendor/products/',
    headers=headers
)
products = response.json()
print(f"Found {len(products)} products")
```

### Example 3: Update Product (JavaScript)

```javascript
const updateProduct = async (productId, updates) => {
  const response = await fetch(
    `http://localhost:8000/api/vendor/products/${productId}/edit/`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    },
  );
  return response.json();
};

await updateProduct(1, {
  title: "Updated Title",
  price: "399.00",
});
```

### Example 4: Toggle Availability (cURL)

```bash
curl -X PATCH http://localhost:8000/api/vendor/products/1/status/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"is_available": false}'
```

### Example 5: Update Quantity (cURL)

```bash
curl -X PATCH http://localhost:8000/api/vendor/products/1/quantity/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"available_quantity": 200}'
```

---

## Product Workflow

```
1. Vendor creates product
   ↓
   POST /api/vendor/products/add/
   → status: "pending"
   ↓

2. Admin reviews product
   ↓ (via Django admin)
   → status: "approved" or "rejected"
   ↓

3. Vendor can now sell (if approved)
   ↓
   GET /api/vendor/products/
   → [list of products]
   ↓

4. Vendor manages inventory
   ↓
   PATCH /api/vendor/products/<id>/quantity/
   → Update available_quantity
   ↓

5. Out of stock?
   ↓
   PATCH /api/vendor/products/<id>/status/
   → Toggle is_available
   ↓

6. Need to edit?
   ↓
   PUT /api/vendor/products/<id>/edit/
   → Updates product, status → pending
   ↓

7. Delete old product?
   ↓
   DELETE /api/vendor/products/<id>/delete/
   → (only if no active orders)
```

---

## Product Status Lifecycle

```
┌─────────────┐
│   PENDING   │ ← Initial status after creation
└──────┬──────┘
       │ Admin reviews
       ├──────────────┐
       ↓              ↓
    APPROVED      REJECTED
    (can sell)    (contact admin)
       │
       ↓
   Edit → Status resets to PENDING
```

---

## Security Features

✅ JWT authentication required  
✅ Vendor-scoped queries (each vendor only sees their products)  
✅ Authorization checks on edit/delete operations  
✅ Active orders validation before deletion  
✅ Status reset protection (prevents approval bypass)  
✅ Input validation on all fields

---

## Field Specifications

### Product Fields (Creation/Update)

| Field                | Type    | Required | Notes                                             |
| -------------------- | ------- | -------- | ------------------------------------------------- |
| title                | String  | Yes      | Max 200 chars                                     |
| name                 | String  | No       | Auto-filled from title                            |
| description          | Text    | Yes      | Detailed product info                             |
| short_description    | String  | No       | Max 500 chars                                     |
| category_type        | Choice  | Yes      | face_wash, soap, serum, toner, moisturizer, other |
| ingredients          | Text    | No       | Comma-separated                                   |
| price                | Decimal | Yes      | Max 8 digits, 2 decimals                          |
| available_quantity   | Integer | Yes      | Min 0                                             |
| image                | File    | No       | Product image                                     |
| is_natural_certified | Boolean | No       | Default: False                                    |
| sku                  | String  | No       | Unique per product                                |
| tags                 | String  | No       | Comma-separated                                   |
| product_type         | Choice  | Yes      | skincare, clothing, bodycare                      |
| unit                 | Choice  | No       | ml, gm, pcs (default: pcs)                        |

### Auto-Generated Fields

| Field         | Value                   | Notes                  |
| ------------- | ----------------------- | ---------------------- |
| slug          | slugified(title)        | Unique, auto-generated |
| vendor        | From JWT token          | Vendor ID              |
| status        | "pending"               | Set on creation        |
| inventory_qty | From available_quantity | Kept in sync           |
| created_at    | Now                     | Immutable              |
| updated_at    | Now                     | Updated on edit        |

---

## Rate Limiting & Performance

- No specific rate limits (configure in production)
- Database queries optimized with select_related
- Pagination recommended for large vendor inventories
- Consider caching for frequently accessed product lists

---

## Migration Notes

If upgrading from previous schema:

1. Existing products maintain their status
2. New vendor products start with status='pending'
3. No data loss during transition

---

## Support

For issues or questions:

1. Check response status codes
2. Review error messages
3. Verify JWT token is valid
4. Ensure vendor is approved (required for product creation)

---

**Version:** 1.0  
**Last Updated:** March 23, 2026  
**Status:** Production Ready ✅
