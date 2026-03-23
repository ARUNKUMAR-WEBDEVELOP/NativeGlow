# Quick Reference - Vendor Product Management API

## 🔐 Authentication
All endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer {access_token}
```

---

## 📝 Endpoint Summary

| # | Method | Endpoint | Purpose | Status |
|----|--------|----------|---------|--------|
| 1 | POST | `/api/vendor/products/add/` | Create new product | 201 |
| 2 | GET | `/api/vendor/products/` | List your products | 200 |
| 3 | PUT | `/api/vendor/products/{id}/edit/` | Update product | 200 |
| 4 | DELETE | `/api/vendor/products/{id}/delete/` | Remove product | 204 |
| 5 | PATCH | `/api/vendor/products/{id}/status/` | Toggle availability | 200 |
| 6 | PATCH | `/api/vendor/products/{id}/quantity/` | Update stock | 200 |

---

## ➕ 1. Add Product
```bash
POST /api/vendor/products/add/
Authorization: Bearer {token}

{
  "title": "Product Name",
  "description": "Long description",
  "category_type": "face_wash|shampoo|...",
  "price": "299.00",
  "available_quantity": 50,
  "is_natural_certified": true
}
```
**→ Returns:** Product object with `status: "pending"`

---

## 📋 2. List Products
```bash
GET /api/vendor/products/
Authorization: Bearer {token}
```
**→ Returns:** Array of your products (vendor-scoped)

---

## ✏️ 3. Edit Product
```bash
PUT /api/vendor/products/{id}/edit/
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "price": "349.00"
  // ... any other fields
}
```
**→ Returns:** Updated product  
⚠️ **Note:** If product was approved, status resets to pending

---

## ❌ 4. Delete Product
```bash
DELETE /api/vendor/products/{id}/delete/
Authorization: Bearer {token}
```
**→ Returns:** 204 No Content  
❌ **Fails if:** Product has active orders

---

## 🔄 5. Toggle Availability
```bash
PATCH /api/vendor/products/{id}/status/
Authorization: Bearer {token}

{
  "is_available": false
}
```
**→ Returns:** Updated availability status

---

## 📦 6. Update Quantity
```bash
PATCH /api/vendor/products/{id}/quantity/
Authorization: Bearer {token}

{
  "available_quantity": 100
}
```
**→ Returns:** Updated quantity  
⚠️ **Note:** Auto-syncs inventory fields

---

## ⚡ Quick Examples

### Get Token
```bash
curl -X POST http://localhost:8000/api/vendor/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@example.com","password":"pass123"}'
```

### Add Product
```bash
curl -X POST http://localhost:8000/api/vendor/products/add/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Face Wash",
    "description":"Natural face wash",
    "category_type":"face_wash",
    "price":"299.00",
    "available_quantity":50,
    "is_natural_certified":true
  }'
```

### List Products
```bash
curl http://localhost:8000/api/vendor/products/ \
  -H "Authorization: Bearer {token}"
```

### Edit Product
```bash
curl -X PUT http://localhost:8000/api/vendor/products/42/edit/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title","price":"349.00"}'
```

### Mark Out of Stock
```bash
curl -X PATCH http://localhost:8000/api/vendor/products/42/status/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"is_available":false}'
```

### Update Stock
```bash
curl -X PATCH http://localhost:8000/api/vendor/products/42/quantity/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"available_quantity":150}'
```

### Delete Product
```bash
curl -X DELETE http://localhost:8000/api/vendor/products/42/delete/ \
  -H "Authorization: Bearer {token}"
```

---

## 🔍 Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Edit, status, quantity updates |
| 201 | Resource created | Add product |
| 204 | Resource deleted | Delete product |
| 400 | Bad request | Invalid data, negative quantity |
| 401 | Not authenticated | Missing/invalid token |
| 403 | Not authorized | Editing another vendor's product |
| 404 | Not found | Product ID doesn't exist |

---

## ❌ Common Errors

### 401 Unauthorized
```json
{"detail": "Authentication credentials were not provided."}
```
**Fix:** Add `Authorization: Bearer {token}` header

### 404 Not Found
```json
{"detail": "Not found."}
```
**Fix:** Check product ID exists, and you own it

### 400 Bad Request
```json
{"title": ["This field may not be blank."]}
```
**Fix:** Check required fields (title, category_type, price, description)

### 400 Cannot Delete
```json
{"detail": "Cannot delete product with active orders"}
```
**Fix:** Can't delete products with pending orders

---

## ✅ Product Statuses

| Status | Meaning | Can Sell |
|--------|---------|----------|
| pending | Awaiting admin review | ❌ No |
| approved | Admin approved | ✅ Yes |
| rejected | Admin rejected | ❌ No |

⚠️ **Auto-reset:** Editing an approved product resets status to pending

---

## 📊 Field Reference

### Required Fields (Add)
- `title` - Product name
- `category_type` - Category code
- `description` - Long description (min 10 chars)
- `price` - Decimal price (must be positive)
- `available_quantity` - Integer stock count

### Optional Fields (Add)
- `is_natural_certified` - Boolean (default: false)
- `ingredients` - String
- `sku` - Stock keeping unit
- `tags` - Comma-separated tags
- `short_description` - Override auto-generated
- `image` - Product image (multipart)

### Editable Fields (Edit)
All fields from Add except `category_type` (fixed after creation)

### Single-field Updates
- `is_available` - Boolean (status endpoint)
- `available_quantity` - Non-negative integer (quantity endpoint)

---

## 📈 Typical Workflow

```
1. tenant registers/logs in → get JWT token
2. POST /add/ → create product → status: pending
3. (Admin reviews offline)
4. Status auto-updates to approved → product live
5. PUT /edit/ → if was approved, resets to pending
6. PATCH /quantity/ → update stock as items sell
7. PATCH /status/ → toggle availability
8. DELETE → remove if no active orders
```

---

## 🚀 Production Checklist

- [ ] JWT tokens configured (24hr expiry)
- [ ] Database backups enabled
- [ ] Error logging configured
- [ ] Rate limiting on endpoints (optional)
- [ ] CORS enabled for frontend domain
- [ ] HTTPS enforced
- [ ] Database indexes on vendor_id, category_type
- [ ] Admin approval workflow documented
- [ ] Notification emails configured
- [ ] File upload limits set

---

## 📚 Full Docs
See `VENDOR_PRODUCTS_SETUP_GUIDE.md` for complete documentation

**Last Updated:** January 2024 | **Version:** 1.0
