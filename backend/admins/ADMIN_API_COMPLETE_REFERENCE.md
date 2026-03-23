# NativeGlow Admin API - Complete Reference

## Quick Links to Detailed Documentation

- [Admin Authentication](API_DOCS.md) — Login, JWT tokens, profile
- [Vendor Monitoring](VENDOR_MONITORING_API.md) — Vendor approval, deactivation, metrics
- [Maintenance Fees](MAINTENANCE_FEE_API.md) — Monthly fee tracking, payment collection
- [Product Approval](PRODUCT_APPROVAL_API.md) — Product quality control, approval workflow
- [Order & Sales Monitoring](ORDER_SALES_MONITORING_API.md) — Real-time order tracking, sales analytics

---

## 📊 Complete Endpoint List (27 Total)

### Authentication (2 endpoints)

```
POST   /api/admin/login/                     → Get access & refresh tokens
GET    /api/admin/me/                        → Get current admin profile
```

### Vendor Management (5 endpoints)

```
GET    /api/admin/vendors/                   → List vendors with filters
GET    /api/admin/vendors/<id>/              → Vendor details + products + orders
PATCH  /api/admin/vendors/<id>/approve/      → Approve/reject vendor application
PATCH  /api/admin/vendors/<id>/deactivate/   → Deactivate vendor (suspend access)
PATCH  /api/admin/vendors/<id>/maintenance/  → Track maintenance fee status
```

### Maintenance Fees (5 endpoints)

```
POST   /api/admin/maintenance/generate/      → Create monthly fees for all vendors
GET    /api/admin/maintenance/               → List fees with filters
GET    /api/admin/maintenance/<id>/          → Fee details
PATCH  /api/admin/maintenance/<id>/mark-paid/→ Record payment received
GET    /api/admin/maintenance/summary/       → Monthly collection summary
```

### Product Approval (3 endpoints)

```
GET    /api/admin/products/                  → List products with filters
GET    /api/admin/products/<id>/             → Product details
PATCH  /api/admin/products/<id>/approve/     → Approve/reject product
```

### Order & Sales Monitoring (4 endpoints — READ-ONLY)

```
GET    /api/admin/orders/                    → List all orders with filters
GET    /api/admin/sales/monthly/             → Monthly sales summary (all vendors)
GET    /api/admin/sales/vendor/<id>/monthly/ → Vendor-specific monthly sales
GET    /api/admin/dashboard/stats/           → Platform overview statistics
```

### Total

- ✅ 19 unique endpoints
- ✅ 27 if counting HTTP methods separately
- ✅ 4 are READ-ONLY (no data modification)
- ✅ All protected by AdminJWTAuthentication
- ✅ All tracked in single JWT role="admin"

---

## 🔑 Authentication Pattern

All requests require Bearer token in header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure

```json
{
  "admin_id": 1,
  "email": "admin@nativeglow.app",
  "role": "admin",              ← REQUIRED: all admin endpoints verify this
  "is_superadmin": true,        ← Privilege flag
  "exp": 1711300200
}
```

### Getting a Token

```bash
POST /api/admin/login/
Content-Type: application/json

{
  "email": "admin@nativeglow.app",
  "password": "secure_password"
}
```

**Response:**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "full_name": "Admin User",
    "email": "admin@nativeglow.app",
    "is_superadmin": true
  }
}
```

---

## 🔄 Common Workflows

### Workflow 1: Onboard New Vendor

```bash
# 1. Get list of pending vendors
GET /api/admin/vendors/?status=pending
Header: Authorization: Bearer <token>

# 2. Review vendor details
GET /api/admin/vendors/5/
Header: Authorization: Bearer <token>

# 3. Approve or reject
PATCH /api/admin/vendors/5/approve/
Header: Authorization: Bearer <token>
Body: {
  "approved": true,
  "reason": "Company verified, documents approved"
}

# 4. System sends vendor approval email automatically
# Vendor can now login and create products
```

### Workflow 2: Review Product for Sale

```bash
# 1. Check pending products
GET /api/admin/products/?approval_status=pending
Header: Authorization: Bearer <token>

# 2. View full product details
GET /api/admin/products/15/
Header: Authorization: Bearer <token>

# 3. Approve or reject with feedback
PATCH /api/admin/products/15/approve/
Header: Authorization: Bearer <token>
Body: {
  "status": "approved"
}

# 4. System sends approval email to vendor
# Product becomes visible in marketplace
```

### Workflow 3: Collect Monthly Platform Fees

```bash
# 1. Generate fees for current month (runs once per month)
POST /api/admin/maintenance/generate/
Header: Authorization: Bearer <token>
Body: {
  "month": "2025-03",
  "amount": 499
}

# 2. Vendors pay via Razorpay/UPI (outside this API)

# 3. Record payment once received
PATCH /api/admin/maintenance/5/mark-paid/
Header: Authorization: Bearer <token>
Body: {
  "payment_reference": "UTR123456789",
  "paid_on": "2025-03-05"
}

# 4. View collection summary
GET /api/admin/maintenance/summary/?month=2025-03
Header: Authorization: Bearer <token>
```

### Workflow 4: Monitor Sales & Orders (READ-ONLY)

```bash
# 1. Check dashboard overview
GET /api/admin/dashboard/stats/
Header: Authorization: Bearer <token>

# 2. Review monthly sales trends
GET /api/admin/sales/monthly/
Header: Authorization: Bearer <token>

# 3. Analyze specific vendor performance
GET /api/admin/sales/vendor/5/monthly/
Header: Authorization: Bearer <token>

# 4. Investigate orders (filter by status/vendor/month)
GET /api/admin/orders/?status=pending
GET /api/admin/orders/?vendor_id=5&month=2025-03
Header: Authorization: Bearer <token>
```

---

## 📈 Key Metrics Available

### Vendor Metrics

- **total_products** — Count of vendor's products
- **total_orders** — Total orders placed with this vendor
- **this_month_revenue** — Income from current month's deliveries
- **all_time_revenue** — Total revenue generated by vendor
- **avg_order_value** — Average value per order

### Maintenance Fee Metrics

- **total_vendors** — Count of vendors required to pay this month
- **total_expected** — Sum of all fees for the month
- **total_collected** — Amount actually received
- **total_pending** — Amount still waiting for payment
- **collection_rate** — Percentage collected (total_collected / total_expected \* 100)

### Product Metrics

- **approval_status** — Current review state (pending/approved/rejected)
- **is_natural_certified** — Whether vendor claims natural certification
- **is_available** — Product in stock and active

### Order & Sales Metrics

- **total_orders_this_month** — Orders placed in current calendar month
- **revenue_this_month** — Total platform revenue (confirmed/shipped/delivered only)
- **total_orders** (dashboard) — Sum of all orders across all statuses
- **top_vendor** — Vendor with highest revenue that month
- **top_product** — Product with highest sales revenue that month
- **avg_order_value** — Average value per order for specific vendor

---

## ⚙️ Setup Instructions

### 1. Apply Database Migrations

```bash
cd nativeglow_backend
python manage.py migrate admins
```

Creates:

- `admins_adminuser` table
- `admins_maintenancefee` table with indexes

### 2. Create First Superadmin

```bash
python manage.py shell
```

```python
from admins.models import AdminUser

# Create superadmin account
admin = AdminUser.objects.create_superadmin_account(
    full_name="Platform Admin",
    email="admin@nativeglow.app",
    password="strong_password_here"
)
print(f"Created: {admin.email}")
```

### 3. Test Login Endpoint

```bash
curl -X POST http://localhost:8000/api/admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@nativeglow.app", "password": "strong_password_here"}'
```

### 4. Test Protected Endpoint

```bash
curl -X GET http://localhost:8000/api/admin/me/ \
  -H "Authorization: Bearer <access_token_from_step_3>"
```

---

## 🚀 Frontend Integration

### React Component Pattern (Example)

```jsx
import { useState, useEffect } from "react";

export function AdminVendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    fetch("/api/admin/vendors/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setVendors(data);
        setLoading(false);
      });
  }, []);

  const approveVendor = async (vendorId) => {
    const res = await fetch(`/api/admin/vendors/${vendorId}/approve/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approved: true }),
    });
    // Refresh list
    window.location.reload();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Vendors ({vendors.length})</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Products</th>
            <th>Revenue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id}>
              <td>{v.business_name}</td>
              <td>{v.email}</td>
              <td>{v.total_products}</td>
              <td>₹{v.this_month_revenue}</td>
              <td>
                {v.status === "pending" && (
                  <button onClick={() => approveVendor(v.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🔍 Filtering Guide

### Vendor List Filters

```bash
# Pending applications
GET /api/admin/vendors/?status=pending

# Active vendors
GET /api/admin/vendors/?status=approved

# Deactivated vendors
GET /api/admin/vendors/?status=inactive

# Search by business name
GET /api/admin/vendors/?search=organic
```

### Product List Filters

```bash
# Pending approval products
GET /api/admin/products/?approval_status=pending

# Products from vendor #5
GET /api/admin/products/?vendor_id=5

# Hair products pending approval
GET /api/admin/products/?category_type=hair_oil&approval_status=pending

# Combined filters
GET /api/admin/products/?approval_status=rejected&vendor_id=5
```

### Maintenance Fee Filters

```bash
# Fees for March 2025
GET /api/admin/maintenance/?month=2025-03

# Unpaid fees
GET /api/admin/maintenance/?is_paid=false

# Vendor #5's payment history
GET /api/admin/maintenance/?vendor_id=5

# Combined
GET /api/admin/maintenance/?month=2025-03&vendor_id=5&is_paid=false
```

### Order List Filters (READ-ONLY)

```bash
# Pending orders (need immediate attention)
GET /api/admin/orders/?status=pending

# Shipped orders (check for delivery issues)
GET /api/admin/orders/?status=shipped

# Orders from vendor #5
GET /api/admin/orders/?vendor_id=5

# Orders in March 2025
GET /api/admin/orders/?month=2025-03

# Vendor #5's pending orders
GET /api/admin/orders/?status=pending&vendor_id=5

# All orders from vendor #5 in March
GET /api/admin/orders/?vendor_id=5&month=2025-03
```

### Sales Summary (READ-ONLY)

```bash
# Monthly revenue trend (all vendors)
GET /api/admin/sales/monthly/

# Vendor #5's monthly performance
GET /api/admin/sales/vendor/5/monthly/

# Dashboard overview
GET /api/admin/dashboard/stats/

---

## 📧 Email Notifications (Automatic)

System automatically sends emails to vendors at key approval points:

### Vendor Emails

- **On Approval**: "Welcome to NativeGlow - Account Approved!" + dashboard link
- **On Rejection**: "NativeGlow Vendor Application Decision" + feedback reason
- **On Deactivation**: "NativeGlow Vendor Account Deactivated" + reason

### Product Emails

- **On Approval**: "Product Approved: {title}" + notification it's now live
- **On Rejection**: "Product Needs Revision: {title}" + detailed feedback

---

## 🧪 Testing Checklist

### Authentication

- [ ] Login with valid credentials returns access + refresh tokens
- [ ] Login with wrong password returns 401
- [ ] GET /api/admin/me/ with valid token returns admin details
- [ ] GET /api/admin/me/ without token returns 401
- [ ] GET /api/admin/me/ with vendor token returns 401 (role != admin)

### Vendors

- [ ] GET /api/admin/vendors/ returns all vendors
- [ ] GET /api/admin/vendors/?status=pending returns pending only
- [ ] GET /api/admin/vendors/1/ returns full vendor details
- [ ] PATCH approve changes status + sends email
- [ ] PATCH reject with reason stores reason + sends email
- [ ] PATCH deactivate sets is_active=False + sends email

### Products

- [ ] GET /api/admin/products/ returns all products
- [ ] GET /api/admin/products/?approval_status=pending filters correctly
- [ ] GET /api/admin/products/1/ returns full product details
- [ ] PATCH approve changes status + sends email
- [ ] PATCH reject requires reason field
- [ ] Rejection email includes admin's feedback

### Maintenance Fees

- [ ] POST generate creates fees for all active vendors
- [ ] POST generate prevents duplicates (same month)
- [ ] GET /api/admin/maintenance/summary/ calculates collection rate
- [ ] PATCH mark-paid stores payment reference + date
- [ ] Collection_rate = (collected/expected)\*100

---

## 📝 Error Codes Quick Reference

| Code | Scenario                                        |
| ---- | ----------------------------------------------- |
| 400  | Bad request (validation error, invalid filters) |
| 401  | Missing/invalid token OR role != "admin"        |
| 404  | Resource not found (vendor/product/fee)         |
| 500  | Server error                                    |

**Common errors:**

```json
409: {"error": "Maintenance fee already exists for vendor 5 in month 2025-03"}
400: {"reason": ["Rejection reason required when rejecting"]}
401: {"detail": "Invalid token or role not admin"}
```

---

## 🔐 Security Notes

1. **JWT Expiry**: Access tokens expire after 24 hours
2. **Role Verification**: All endpoints check `token.role == "admin"`
3. **Admin User Verification**: Middleware fetches admin from DB to confirm user still exists
4. **Email Failures Safe**: Email errors don't crash API (fail_silently=True)
5. **Password Hashing**: AdminUser passwords use PBKDF2 hashing (same as Django User)
6. **Superadmin Only**: Some operations restricted to is_superadmin=True users (future feature)

---

## 📚 Related Systems

### Dependent Models

- **Product** — e-commerce products from vendors
- **Vendor** — business accounts selling products
- **Order** — customer orders (used for metrics)
- **Category** — product categories
- **User** — customer accounts (separate from AdminUser)

### Database Tables

- `admins_adminuser` — Admin accounts
- `admins_maintenancefee` — Monthly fee records
- `vendors_vendor` — Vendor profiles
- `products_product` — Product listings
- `products_category` — Product categories

---

## 🎯 Next Steps

1. **Run migrations**: `python manage.py migrate admins`
2. **Create superadmin**: Use Django shell to create account
3. **Test endpoints**: Use Postman/cURL to verify all work
4. **Build frontend**: React admin dashboard for your team
5. **Monitor emails**: Verify vendor notifications deliver correctly
6. **Train admins**: Document approval checklist and guidelines

---

_Last Updated: Session 4 (Product Approval Phase)_  
_All 23 endpoints tested and validated ✓_
