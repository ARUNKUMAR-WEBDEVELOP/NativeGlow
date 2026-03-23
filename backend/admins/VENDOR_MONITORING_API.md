# Admin Vendor Monitoring API Documentation

## Overview
Comprehensive vendor management APIs for admins. All endpoints require **AdminJWTAuthentication** (Bearer token with role="admin").

---

## Endpoints

### 1. List All Vendors
**GET** `/api/admin/vendors/`

List all vendors with optional filtering and search.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `status` (optional): Filter by status
  - `pending` — Not approved yet
  - `approved` — Approved and active
  - `inactive` — Deactivated
- `search` (optional): Search vendors by business_name

**Examples:**
```
GET /api/admin/vendors/
GET /api/admin/vendors/?status=pending
GET /api/admin/vendors/?status=approved
GET /api/admin/vendors/?status=inactive
GET /api/admin/vendors/?search=organic%20farm
GET /api/admin/vendors/?status=pending&search=natural
```

**Response (200):**
```json
[
  {
    "id": 1,
    "full_name": "John Doe",
    "business_name": "Organic Farms",
    "email": "john@organicfarms.com",
    "city": "Mumbai",
    "whatsapp_number": "+919876543210",
    "is_approved": true,
    "is_active": true,
    "maintenance_due": false,
    "created_at": "2026-03-20T08:00:00Z",
    "total_products": 12,
    "total_orders": 45,
    "this_month_revenue": 15500.00,
    "status": "approved"
  },
  {
    "id": 2,
    "full_name": "Jane Smith",
    "business_name": "Natural Skincare Co",
    "email": "jane@naturalskincare.com",
    "city": "Bangalore",
    "whatsapp_number": "+919123456789",
    "is_approved": false,
    "is_active": true,
    "maintenance_due": false,
    "created_at": "2026-03-22T10:30:00Z",
    "total_products": 0,
    "total_orders": 0,
    "this_month_revenue": 0.00,
    "status": "pending"
  }
]
```

**Error Examples:**
- 401: `{"detail": "Authentication credentials were not provided."}`
- 401: `{"detail": "Token is not an admin token."}`

---

### 2. Vendor Details
**GET** `/api/admin/vendors/<id>/`

Get full vendor profile with products, orders, and revenue metrics.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "full_name": "John Doe",
  "business_name": "Organic Farms",
  "email": "john@organicfarms.com",
  "city": "Mumbai",
  "whatsapp_number": "+919876543210",
  "upi_id": "john@upi",
  "bank_account_number": "1234567890",
  "bank_ifsc": "SBIN0001234",
  "account_holder_name": "John Doe",
  "is_approved": true,
  "is_active": true,
  "maintenance_due": false,
  "created_at": "2026-03-20T08:00:00Z",
  "updated_at": "2026-03-23T10:30:00Z",
  "total_products": 12,
  "total_orders": 45,
  "this_month_revenue": 15500.00,
  "all_time_revenue": 125000.00,
  "avg_order_value": 2777.78,
  "status": "approved",
  "products": [
    {
      "id": 1,
      "name": "Organic Face Wash",
      "price": "299.00",
      "status": "approved",
      "is_active": true,
      "available_quantity": 50,
      "created_at": "2026-03-21T09:00:00Z"
    }
  ],
  "recent_orders": [
    {
      "id": 1,
      "order_id": "550e8400-e29b-41d4-a716-446655440000",
      "buyer_name": "Rajesh Kumar",
      "quantity": 2,
      "total_amount": 598.00,
      "status": "delivered",
      "created_at": "2026-03-22T14:30:00Z"
    }
  ]
}
```

**Error Examples:**
- 404: `{"detail": "Vendor with id 999 not found."}`

---

### 3. Approve/Reject Vendor
**PATCH** `/api/admin/vendors/<id>/approve/`

Approve or reject a vendor application. Sends confirmation/rejection email.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body (Approve):**
```json
{
  "approved": true
}
```

**Request Body (Reject):**
```json
{
  "approved": false,
  "reason": "Does not meet natural product certification requirements"
}
```

**Response (200) — Approval:**
```json
{
  "message": "Vendor Organic Farms approved successfully.",
  "vendor_id": 1,
  "is_approved": true
}
```

**Response (200) — Rejection:**
```json
{
  "message": "Vendor Natural Skincare Co rejected.",
  "vendor_id": 2,
  "is_approved": false,
  "reason": "Does not meet natural product certification requirements"
}
```

**Actions:**
- **On Approval**: Sends welcome email with dashboard link
- **On Rejection**: Sends rejection email with reason

**Error Examples:**
- 400: `{"reason": ["Reason is required for rejection."]}`
- 404: `{"detail": "Vendor with id 999 not found."}`

---

### 4. Deactivate Vendor
**PATCH** `/api/admin/vendors/<id>/deactivate/`

Deactivate vendor account (vendor cannot login but account exists).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "reason": "Violation of natural product policy - selling synthetic products"
}
```

**Response (200):**
```json
{
  "message": "Vendor Organic Farms deactivated.",
  "vendor_id": 1,
  "is_active": false,
  "reason": "Violation of natural product policy - selling synthetic products"
}
```

**Actions:**
- Sets `is_active = False` (vendor cannot login)
- Sends deactivation notification email with reason
- Vendor's orders still visible but cannot create new products

**Error Examples:**
- 400: `{"reason": ["This field is required."]}`
- 404: `{"detail": "Vendor with id 999 not found."}`

---

### 5. Maintenance Fee Management
**PATCH** `/api/admin/vendors/<id>/maintenance/`

Update vendor maintenance fee status (monthly subscription tracking).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body (Mark as Paid):**
```json
{
  "paid": true,
  "month": "2025-03"
}
```

**Request Body (Mark as Unpaid/Overdue):**
```json
{
  "paid": false,
  "month": "2025-03"
}
```

**Response (200) — Paid:**
```json
{
  "message": "Maintenance fee for 2025-03 marked as PAID.",
  "vendor_id": 1,
  "month": "2025-03",
  "status": "paid",
  "maintenance_due": false
}
```

**Response (200) — Unpaid:**
```json
{
  "message": "Maintenance fee for 2025-03 marked as PENDING/UNPAID.",
  "vendor_id": 1,
  "month": "2025-03",
  "status": "pending",
  "maintenance_due": true
}
```

**Actions:**
- **On Payment**: Creates/updates MaintenancePayment record with status='paid'
- **On Non-Payment**: Creates/updates MaintenancePayment record with status='pending'
- **Sets Flag**: `maintenance_due` flag reflects current month payment status

**Error Examples:**
- 400: `{"month": ["Month must be in format YYYY-MM (e.g., 2025-03)"]}`
- 404: `{"detail": "Vendor with id 999 not found."}`

---

## Authentication

All vendor monitoring endpoints use **AdminJWTAuthentication**:

1. Admin logs in via `POST /api/admin/login/`
2. Receives access token with `role="admin"` claim
3. Includes token in Authorization header: `Bearer <token>`
4. AdminJWTAuthentication verifies:
   - Token valid and not expired
   - `role == "admin"` in payload
   - Admin user exists in database

---

## Response Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Vendor not found |
| 500 | Server error |

---

## Vendor Status Values

```
"status": "pending"   — Not approved yet
"status": "approved"  — Approved and active
"status": "inactive"  — Deactivated by admin
```

---

## Field Descriptions

### Vendor Listing Response Field
- **total_products**: Count of all vendor's products
- **total_orders**: Count of all vendor's orders
- **this_month_revenue**: Sum of delivered order amounts this month
- **status**: Calculated status (pending/approved/inactive)

### Vendor Detail Response Fields
- **all_time_revenue**: Sum of ALL delivered orders (not month-limited)
- **avg_order_value**: Total revenue ÷ Number of orders
- **products**: Array of vendor's products with key fields
- **recent_orders**: Last 10 orders with buyer/payment info

---

## Example Usage (JavaScript/Fetch)

```javascript
// Step 1: Admin Login
const loginResponse = await fetch('/api/admin/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@nativeglow.app',
    password: 'secure123'
  })
});

const { access } = await loginResponse.json();

// Step 2: List pending vendors
const listResponse = await fetch('/api/admin/vendors/?status=pending', {
  headers: { 'Authorization': `Bearer ${access}` }
});

const vendors = await listResponse.json();
console.log(vendors); // Array of pending vendors

// Step 3: Get vendor details
const detailResponse = await fetch('/api/admin/vendors/2/', {
  headers: { 'Authorization': `Bearer ${access}` }
});

const vendorDetail = await detailResponse.json();
console.log(vendorDetail); // Full vendor profile + products + orders

// Step 4: Approve vendor
const approveResponse = await fetch('/api/admin/vendors/2/approve/', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access}`
  },
  body: JSON.stringify({ approved: true })
});

const approval = await approveResponse.json();
console.log(approval); // { message, vendor_id, is_approved }

// Step 5: Update maintenance fee
const maintenanceResponse = await fetch('/api/admin/vendors/1/maintenance/', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access}`
  },
  body: JSON.stringify({ paid: true, month: '2025-03' })
});

const maintenance = await maintenanceResponse.json();
console.log(maintenance); // { message, vendor_id, month, status, maintenance_due }
```

---

## Email Templates

### Vendor Approval Email
- Subject: "Welcome to NativeGlow - Account Approved!"
- Content: Business name, dashboard link, welcome message

### Vendor Rejection Email
- Subject: "NativeGlow Vendor Application Decision"
- Content: Rejection reason, support contact info

### Vendor Deactivation Email
- Subject: "NativeGlow Vendor Account Deactivated"
- Content: Deactivation reason, support contact info

---

## Future Enhancements

Potential additional endpoints to build on this foundation:

- `GET /api/admin/products/` — List all products (with approval status)
- `PATCH /api/admin/products/<id>/approve/` — Approve pending products
- `GET /api/admin/orders/` — List all orders with vendor filter
- `PATCH /api/admin/orders/<id>/resolve/` — Resolve order disputes
- `GET /api/admin/analytics/` — Platform-wide analytics (total revenue, vendor count, etc.)
- `POST /api/admin/vendors/<id>/deactivate-reason/` — Log deactivation reasons
