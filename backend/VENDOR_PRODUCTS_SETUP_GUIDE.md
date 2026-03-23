# Vendor Product Management API - Setup & Testing Guide

## Quick Start

### 1. Prerequisites
- Python 3.12+
- Django 6.0.3
- Django REST Framework 3.16.1
- djangorestframework-simplejwt 5.5.1
- PostgreSQL (migrated database)
- Postman (optional, for API testing)

### 2. Verify Installation

```bash
cd D:\memo\nativeglow\backend
python manage.py check
```

Expected output: System check passed

### 3. Get Authentication Token

First, register a vendor:
```bash
curl -X POST http://localhost:8000/api/vendor/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Nature Products",
    "email": "vendor@example.com",
    "password": "SecurePass123!",
    "phone": "9876543210"
  }'
```

Then login to get access token:
```bash
curl -X POST http://localhost:8000/api/vendor/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Copy the `access` token and use it for all subsequent requests.

---

## API Endpoints Reference

### 1. POST /api/vendor/products/add/
**Add new product**

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Organic Face Wash",
  "name": "Organic Face Wash",
  "description": "A gentle natural face wash with herbal ingredients",
  "short_description": "Natural face wash",
  "category_type": "face_wash",
  "ingredients": "Neem, Turmeric, Aloe Vera",
  "price": "299.00",
  "available_quantity": 50,
  "is_natural_certified": true,
  "sku": "OFWASH-001"
}
```

**Response (201 Created):**
```json
{
  "id": 42,
  "title": "Organic Face Wash",
  "slug": "organic-face-wash",
  "description": "A gentle natural face wash with herbal ingredients",
  "category_type": "face_wash",
  "price": "299.00",
  "status": "pending",
  "is_active": true,
  "available_quantity": 50,
  "is_natural_certified": true,
  "message": "Product created successfully. Awaiting admin approval."
}
```

**Error Responses:**
- `400`: Missing required fields (title, category_type, price, description)
- `401`: Invalid or missing token

---

### 2. GET /api/vendor/products/
**List vendor's products**

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
[
  {
    "id": 42,
    "title": "Organic Face Wash",
    "price": "299.00",
    "available_quantity": 50,
    "status": "pending",
    "is_active": true,
    "is_natural_certified": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 43,
    "title": "Herbal Shampoo",
    "price": "199.00",
    "available_quantity": 100,
    "status": "approved",
    "is_active": true,
    "is_natural_certified": true,
    "created_at": "2024-01-14T09:15:00Z",
    "updated_at": "2024-01-14T09:15:00Z"
  }
]
```

**Query Parameters:**
- None (lists all vendor's products ordered by creation date)

**Error Responses:**
- `401`: Invalid or missing token

---

### 3. PUT /api/vendor/products/<id>/edit/
**Edit product details**

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:** (all fields optional)
```json
{
  "title": "Premium Organic Face Wash",
  "description": "Now with added cucumber extract",
  "price": "349.00",
  "ingredients": "Neem, Turmeric, Aloe Vera, Cucumber",
  "available_quantity": 75,
  "is_natural_certified": true
}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "title": "Premium Organic Face Wash",
  "description": "Now with added cucumber extract",
  "price": "349.00",
  "status": "pending",
  "is_active": true,
  "available_quantity": 75,
  "message": "Product updated. Status reset to pending pending admin re-approval."
}
```

**Important Business Rules:**
- If product was `approved` before edit, status resets to `pending`
- Vendor must own the product (JWT token vendor must match product vendor)

**Error Responses:**
- `400`: Invalid data format
- `401`: Invalid or missing token
- `403`: Product belongs to another vendor
- `404`: Product not found

---

### 4. DELETE /api/vendor/products/<id>/delete/
**Delete product**

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response (204 No Content):**
```
Empty response
```

**Business Rules:**
- Cannot delete if product has active orders
- Only vendor who created product can delete

**Error Responses:**
- `400`: "Cannot delete product with active orders"
- `401`: Invalid or missing token
- `403`: Product belongs to another vendor
- `404`: Product not found

---

### 5. PATCH /api/vendor/products/<id>/status/
**Toggle product availability**

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_available": false
}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "title": "Organic Face Wash",
  "is_active": false,
  "message": "Product availability updated."
}
```

**Use Cases:**
- `"is_available": false` - Mark product as out of stock/unavailable
- `"is_available": true` - Restore availability

**Error Responses:**
- `400`: Missing `is_available` field
- `401`: Invalid or missing token
- `404`: Product not found

---

### 6. PATCH /api/vendor/products/<id>/quantity/
**Update product quantity**

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "available_quantity": 150
}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "title": "Organic Face Wash",
  "available_quantity": 150,
  "inventory_qty": 150,
  "message": "Quantity updated successfully."
}
```

**Validation:**
- Must be non-negative integer (≥ 0)
- Automatically syncs `inventory_qty` field

**Error Responses:**
- `400`: Invalid quantity (negative or non-integer)
- `400`: Missing `available_quantity` field
- `401`: Invalid or missing token
- `404`: Product not found

---

## Testing with Postman

### Import Collection
1. Open Postman
2. Click `Import`
3. Select `VENDOR_PRODUCT_MANAGEMENT_API.postman_collection.json`
4. Click `Import`

### Set Token Variable
1. In Postman, go to `Collections` → `NativeGlow Vendor Product Management API`
2. Click `Variables` tab
3. Set `access_token` value with your JWT token from login
4. Save

### Run Tests
1. Click `Send` on each endpoint
2. Or use Collection Runner for batch testing

---

## Common Workflows

### Workflow 1: New Product Launch
```bash
# 1. Add product
POST /api/vendor/products/add/

# 2. List to verify
GET /api/vendor/products/

# 3. Wait for admin approval (status changes from pending → approved)

# 4. Start selling (status is now approved)
```

### Workflow 2: Update Product After Approval
```bash
# 1. Edit approved product
PUT /api/vendor/products/42/edit/

# 2. Check status (will be reset to pending)
GET /api/vendor/products/

# 3. Wait for re-approval
```

### Workflow 3: Manage Inventory
```bash
# 1. Check quantity
GET /api/vendor/products/

# 2. Update quantity after restock
PATCH /api/vendor/products/42/quantity/
  {
    "available_quantity": 200
  }

# 3. Mark out of stock if needed
PATCH /api/vendor/products/42/status/
  {
    "is_available": false
  }

# 4. Re-enable when back in stock
PATCH /api/vendor/products/42/status/
  {
    "is_available": true
  }
```

### Workflow 4: Product Removal
```bash
# 1. Check if product has active orders
GET /api/vendor/products/

# 2. If no orders, delete
DELETE /api/vendor/products/42/delete/

# 3. Verify deletion
GET /api/vendor/products/
# Product 42 should no longer appear
```

---

## Error Handling Examples

### Missing Authentication
```bash
curl http://localhost:8000/api/vendor/products/
```
Response (401):
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Invalid Token
```bash
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:8000/api/vendor/products/
```
Response (401):
```json
{
  "detail": "Invalid token."
}
```

### Product Not Found
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/vendor/products/99999/edit/
```
Response (404):
```json
{
  "detail": "Not found."
}
```

### Invalid Quantity
```bash
curl -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"available_quantity": -10}' \
  http://localhost:8000/api/vendor/products/42/quantity/
```
Response (400):
```json
{
  "available_quantity": [
    "Ensure this value is greater than or equal to 0."
  ]
}
```

### Cannot Delete (Active Orders)
```bash
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/vendor/products/42/delete/
```
Response (400):
```json
{
  "detail": "Cannot delete product with active orders"
}
```

---

## Product Status Lifecycle

```
New Product
    ↓
    └─→ [pending] (awaiting admin review)
           ├─→ [approved] (admin approved, can be sold)
           │     └─→ [pending] (if edited before sale)
           │        ├─→ [approved] (re-approved)
           │        └─→ [rejected] (if rejected)
           └─→ [rejected] (admin rejected) - visible as inactive
```

---

## Field Specifications

### Create Product - Required Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| title | string | "Organic Face Wash" | Auto-slugified |
| category_type | string | "face_wash" | Must be valid category |
| description | string | "Herbal face wash..." | Min 10 chars |
| price | decimal | "299.00" | Must be positive |
| available_quantity | integer | 50 | Must be ≥ 0 |

### Create Product - Optional Fields
| Field | Type | Example | Default |
|-------|------|---------|---------|
| name | string | "Organic Face Wash" | Same as title |
| short_description | string | "Natural face wash" | First 100 chars of description |
| ingredients | string | "Neem, Turmeric..." | "" |
| is_natural_certified | boolean | true | false |
| sku | string | "OFWASH-001" | Auto-generated |
| tags | string | "organic,herbal" | "" |
| product_type | string | "skincare" | "product" |
| unit | string | "ml" | "piece" |
| image | file | (binary) | No image |

---

## Response Time Expectations

| Endpoint | Method | Time |
|----------|--------|------|
| Add Product | POST | 100-200ms |
| List Products | GET | 50-100ms |
| Edit Product | PUT | 100-200ms |
| Toggle Status | PATCH | 50-100ms |
| Update Quantity | PATCH | 50-100ms |
| Delete Product | DELETE | 100-200ms |

---

## Security Notes

1. **JWT Tokens:**
   - Tokens expire after 24 hours
   - Use refresh token to get new access token
   - Never share tokens in logs

2. **Vendor Scoping:**
   - Each vendor can only see/modify their own products
   - Vendor ID extracted from JWT token

3. **Order Protection:**
   - Products with active orders cannot be deleted
   - Prevents orphaned order references

4. **Status Management:**
   - Only admins can change status to approved/rejected
   - Vendors cannot bypass approval process

---

## Debugging Tips

### Check Django Logs
```bash
# Terminal running Django
python manage.py runserver
# Logs will show request details
```

### Check Database Directly
```bash
psql nativeglow
SELECT id, title, status, vendor_id FROM products_product 
WHERE vendor_id = {your_vendor_id};
```

### Validate Token
```bash
python manage.py shell
from rest_framework_simplejwt.tokens import AccessToken
token = AccessToken('your_token_here')
print(token.payload)
```

### Test Without Postman
```bash
# Store token
TOKEN="eyJ0eXAi..."

# Add product
curl -X POST http://localhost:8000/api/vendor/products/add/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "category_type": "face_wash",
    "description": "Test description here",
    "price": "299.00",
    "available_quantity": 10
  }'

# List products
curl http://localhost:8000/api/vendor/products/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

1. **Frontend Integration:**
   - Build vendor dashboard to consume these APIs
   - Create product management UI (add, edit, delete)
   - Show real-time inventory and status

2. **Admin Approval Workflow:**
   - Setup Django admin for product approval
   - Send notifications to vendors on approval/rejection

3. **Advanced Features:**
   - Add pagination to product list
   - Filter by status (pending, approved, rejected)
   - Sort by price, date, popularity
   - Search products by title/description

4. **Analytics:**
   - Track product performance
   - Monitor sales per vendor
   - Generate reports

5. **Notifications:**
   - Email vendors when products are approved
   - Alert on low inventory
   - Notify of orders

---

## Support & Documentation

- **API Docs:** See `VENDOR_PRODUCT_MANAGEMENT_API.md`
- **Database Schema:** Check Django models in `products/models.py`
- **Authentication:** See `VENDOR_AUTHENTICATION_API.md`
- **Full Stack:** Refer to `README.md`

---

**Last Updated:** January 2024
**Version:** 1.0
