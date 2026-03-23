# Product Approval API Documentation

## Overview
Admin endpoints for reviewing and managing product approvals. All vendors' products must be approved by admin before appearing in the marketplace. All endpoints require **AdminJWTAuthentication** (Bearer token with role="admin").

---

## API Endpoints

### 1. List Products
**GET** `/api/admin/products/`

List all products from all vendors with filtering options.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `approval_status` (optional) — Filter by approval status
  - `pending` — Awaiting approval
  - `approved` — Approved and live
  - `rejected` — Rejected by admin
  - `active` — Active status
  - `draft` — Draft mode
- `vendor_id` (optional) — Filter by vendor ID (e.g., ?vendor_id=5)
- `category_type` (optional) — Filter by product category
  - face_wash, soap, serum, moisturizer, hair_oil, other

**Examples:**
```
GET /api/admin/products/
GET /api/admin/products/?approval_status=pending
GET /api/admin/products/?approval_status=rejected
GET /api/admin/products/?vendor_id=5
GET /api/admin/products/?category_type=face_wash
GET /api/admin/products/?approval_status=pending&vendor_id=5
```

**Response (200):**
```json
[
  {
    "id": 1,
    "vendor": 5,
    "vendor_name": "Organic Farms",
    "title": "Herbal Face Wash",
    "category": 3,
    "category_name": "Skincare",
    "price": "299.00",
    "status": "pending",
    "approval_status": "pending",
    "is_active": true,
    "is_available": true,
    "is_natural_certified": true,
    "created_at": "2026-03-22T10:30:00Z"
  },
  {
    "id": 2,
    "vendor": 7,
    "vendor_name": "Natural Skincare Co",
    "title": "Organic Soap Bar",
    "category": 2,
    "category_name": "Skincare",
    "price": "149.00",
    "status": "approved",
    "approval_status": "approved",
    "is_active": true,
    "is_available": true,
    "is_natural_certified": true,
    "created_at": "2026-03-10T08:15:00Z"
  }
]
```

**Field Mappings:**
- `status` — Database field (full values: pending, approved, rejected, active, draft, out_of_stock)
- `approval_status` — Maps to status for clarity
- `is_active` — Product availability flag
- `is_available` — Maps to is_active for clarity

**Filtering Logic:**
- All filters combined with AND logic
- Invalid status values return 400 error
- vendor_id must be integer

---

### 2. Product Details
**GET** `/api/admin/products/<id>/`

Get full product information including ingredients, images, and vendor details.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "vendor": 5,
  "vendor_name": "Organic Farms",
  "vendor_email": "john@organicfarms.com",
  "vendor_whatsapp": "+919876543210",
  "title": "Herbal Face Wash",
  "name": "face_wash_herbal_500ml",
  "slug": "herbal-face-wash",
  "description": "100% natural herbal face wash with neem and tulsi...",
  "short_description": "Natural face wash for all skin types",
  "ingredients": "Neem extract, Tulsi, Aloe vera, Rose water, Tea tree oil",
  "category": 3,
  "category_name": "Skincare",
  "category_type": "face_wash",
  "price": "299.00",
  "discount_price": null,
  "available_quantity": 50,
  "is_natural_certified": true,
  "is_active": true,
  "status": "pending",
  "approval_status": "pending",
  "admin_rejection_reason": "",
  "rejection_reason": "",
  "image": "https://cdn.nativeglow.app/products/12345.jpg",
  "created_at": "2026-03-22T10:30:00Z",
  "updated_at": "2026-03-22T10:30:00Z"
}
```

**Field Explanations:**
- `ingredients` — List of key naturals ingredients for verification
- `approval_status` — Current approval state
- `admin_rejection_reason` / `rejection_reason` — Why product was rejected (if applicable)
- `is_natural_certified` — Whether vendor claims natural certification
- `available_quantity` — Current stock level

**Error Examples:**
- 404: `{"detail": "Product with id 999 not found."}`

---

### 3. Approve/Reject Product
**PATCH** `/api/admin/products/<id>/approve/`

Approve a product to make it live, or reject it with feedback.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body (Approve):**
```json
{
  "status": "approved"
}
```

**Request Body (Reject):**
```json
{
  "status": "rejected",
  "reason": "Product contains synthetic ingredients not listed. Please provide accurate ingredient information."
}
```

**Response (200) — Approval:**
```json
{
  "message": "Product \"Herbal Face Wash\" approved successfully.",
  "product_id": 1,
  "product_title": "Herbal Face Wash",
  "status": "approved",
  "rejection_reason": null
}
```

**Response (200) — Rejection:**
```json
{
  "message": "Product \"Herbal Face Wash\" rejected.",
  "product_id": 1,
  "product_title": "Herbal Face Wash",
  "status": "rejected",
  "rejection_reason": "Product contains synthetic ingredients not listed. Please provide accurate ingredient information."
}
```

**Actions:**
- **On Approval**: 
  - Sets `status = 'approved'`
  - Product becomes visible in marketplace
  - Sends approval email to vendor
  
- **On Rejection**:
  - Sets `status = 'rejected'`
  - Stores rejection reason in `admin_rejection_reason`
  - Product hidden from customers
  - Sends rejection email with feedback to vendor

**Validation:**
- `status` must be one of: "approved" or "rejected"
- When rejecting: `reason` is required and must not be empty

**Error Examples:**
- 400: `{"status": ["\"pending\" is not a valid choice. Valid choices are: approved, rejected"]}`
- 400: `{"reason": ["Rejection reason is required when rejecting a product."]}`
- 400: `{"detail": ["Invalid approval_status value."]}`
- 404: `{"detail": "Product with id 999 not found."}`

---

## Email Templates

### Product Approval Email
**To:** vendor.email  
**Subject:** `Product Approved: {product_title}`

**Content:**
```
Dear {vendor_name},

Great news! Your product has been approved and is now live on NativeGlow.

Product Name: {product_title}
Category: {product_category_type}
Price: ₹{price}

Your customers can now discover and purchase this product from your store.

Dashboard: https://nativeglow.app/vendor/dashboard/products

Thank you for partnering with NativeGlow!

Best regards,
NativeGlow Admin Team
```

### Product Rejection Email
**To:** vendor.email  
**Subject:** `Product Needs Revision: {product_title}`

**Content:**
```
Dear {vendor_name},

Thank you for submitting your product to NativeGlow. After review, we have some feedback:

Product Name: {product_title}
Reason: {rejection_reason}

Please review your product details and ingredients, then resubmit for approval.

Guidelines:
- Ensure all ingredients are natural/organic
- Provide accurate ingredient list
- Include proper product description
- Verify certification if claimed

For questions, contact: support@nativeglow.app

Best regards,
NativeGlow Admin Team
```

---

## Workflow Example: Daily Approval Process

### Morning: Check Pending Products
```bash
GET /api/admin/products/?approval_status=pending
```
→ Lists 8 pending products awaiting review

### Review Details
```bash
GET /api/admin/products/15/
```
→ Check ingredients, vendor info, certifications

### Approve Good Product
```bash
PATCH /api/admin/products/15/approve/
{ "status": "approved" }
```
→ Product live, vendor notified via email

### Reject Low-Quality Product
```bash
PATCH /api/admin/products/16/approve/
{
  "status": "rejected",
  "reason": "Ingredients contain water as primary ingredient which typically indicates it's not a concentrated natural extract. Please reformulate or provide documentation of natural extraction process."
}
```
→ Product hidden, vendor notified with specific feedback

### Check Rejected Products
```bash
GET /api/admin/products/?approval_status=rejected
```
→ Track past rejections for reporting/vendor patterns

---

## Status Field Values

| Status | Meaning | Customer Visibility |
|--------|---------|-------------------|
| `pending` | Awaiting admin approval | Hidden |
| `approved` | Approved by admin | Visible in marketplace |
| `rejected` | Rejected by admin | Hidden (with reason) |
| `active` | Currently active/selling | Visible |
| `draft` | Work in progress | Hidden |
| `out_of_stock` | No inventory available | Hidden |

---

## Product Filtering Strategy

### Finding Products to Review
```bash
# All pending products
GET /api/admin/products/?approval_status=pending

# Products from specific vendor
GET /api/admin/products/?vendor_id=5&approval_status=pending

# Products in specific category
GET /api/admin/products/?category_type=face_wash&approval_status=pending
```

### Past Decisions
```bash
# All recently rejected products
GET /api/admin/products/?approval_status=rejected

# Vendor's approved products
GET /api/admin/products/?vendor_id=5&approval_status=approved
```

---

## Validation Rules

### For Approval
- No validation restrictions — can approve any product
- No required fields in request body

### For Rejection
- `status` must equal "rejected"
- `reason` must be provided (non-empty)
- `reason` max length: 500 characters
- `reason` should be specific and helpful to vendor

**Example good rejection reason:**
```
"Face wash contains sulfates (Sodium Lauryl Sulfate) which are not natural. 
Our platform only features chemical-free products. Please reformulate using 
natural surfactants like Shikakai or Acacia Concinna extract."
```

---

## Response Status Codes

| Status | Scenario |
|--------|----------|
| 200 | Success (approval/rejection recorded) |
| 400 | Bad request / validation error |
| 401 | Missing/invalid admin token |
| 401 | Token not admin role |
| 404 | Product not found |
| 500 | Server error |

---

## Integration with Vendor Dashboard

When a vendor logs in to their dashboard:
1. They see products grouped by status
2. **Approved** products are live and earning revenue
3. **Pending** products show notification "Awaiting Admin Review"
4. **Rejected** products show the admin's rejection reason
5. Vendor can edit and resubmit rejected products

---

## Product Approval Checklist (Admin Guidelines)

Before approving, verify:
- [ ] All ingredients are natural/organic (check ingredients field)
- [ ] No synthetic additives or chemicals listed
- [ ] Product description is accurate and clear
- [ ] Company provides legitimate business name and contact
- [ ] Pricing is reasonable (not unreasonably marked up)
- [ ] Images are high quality and product-relevant
- [ ] No false health claims (e.g., "cures cancer")
- [ ] Certifications (organic, cruelty-free) are credible if claimed

---

## Bulk Approval Pattern

While single-product approval is the standard workflow, for efficiency:

```javascript
// Approve multiple products in sequence
const productIds = [1, 2, 3, 4, 5];
for (const id of productIds) {
  await fetch(`/api/admin/products/${id}/approve/`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status: 'approved' })
  });
}
```

---

## Future Enhancements

Potential additional endpoints:
- `GET /api/admin/products/pending-count/` — Count of pending products
- `POST /api/admin/products/bulk-approve/` — Approve multiple products at once
- `GET /api/admin/products/recently-rejected/` — Filter by rejection date
- `GET /api/admin/products/by-vendor/<vendor_id>/` — All products from one vendor
- `PATCH /api/admin/products/<id>/edit/` — Admin corrections to product details
- `DELETE /api/admin/products/<id>/` — Remove product entirely from platform
