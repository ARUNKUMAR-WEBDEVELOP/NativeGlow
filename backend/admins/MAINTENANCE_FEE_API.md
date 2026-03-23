# Maintenance Fee Management API Documentation

## Overview
Administrative system for managing monthly platform subscription fees for vendors. Admins can generate fees, track payments, and monitor collection status.

All endpoints require **AdminJWTAuthentication** (Bearer token with role="admin").

---

## Database Model: MaintenanceFee

**Fields:**
- `id` — Auto-generated primary key
- `vendor` — ForeignKey to Vendor (CASCADE on delete)
- `month` — CharField (YYYY-MM format, e.g., "2025-03"), indexed, unique with vendor
- `amount` — DecimalField (monthly fee amount, default 500)
- `is_paid` — BooleanField (payment status, indexed)
- `paid_on` — DateField (payment date, nullable)
- `payment_reference` — CharField (vendor's UTR/transaction ID)
- `notes` — TextField (admin notes, optional)
- `created_at` — DateTimeField (auto-set on creation)

**Constraints:**
- Unique together: (vendor, month) — prevents duplicate fees for same vendor+month
- Multiple indexes on (month, is_paid) and (vendor, is_paid) for fast filtering

---

## API Endpoints

### 1. Generate Monthly Fees
**POST** `/api/admin/maintenance/generate/`

Create maintenance fees for ALL active vendors for a specified month.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "month": "2025-03",
  "amount": 499
}
```

**Response (201):**
```json
{
  "message": "Maintenance fees generated for month 2025-03.",
  "created": 15,
  "skipped": 2,
  "total_vendors": 17,
  "amount_per_vendor": 499,
  "total_expected": 7485
}
```

**Details:**
- Creates a MaintenanceFee record for each active vendor
- Uses `get_or_create()` to skip vendors that already have fees for that month
- Returns count of created (new) vs skipped (already exist)
- All fees default to `is_paid=False`

**Error Examples:**
- 400: `{"month": ["Month must be in format YYYY-MM (e.g., 2025-03)"]}`
- 400: `{"amount": ["Amount must be greater than 0."]}`

---

### 2. List Maintenance Fees
**GET** `/api/admin/maintenance/`

List all maintenance fees with optional filtering.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `month=YYYY-MM` — Filter by month (e.g., ?month=2025-03)
- `vendor_id=123` — Filter by vendor ID
- `is_paid=true|false` — Filter by payment status

**Examples:**
```
GET /api/admin/maintenance/
GET /api/admin/maintenance/?month=2025-03
GET /api/admin/maintenance/?vendor_id=5
GET /api/admin/maintenance/?is_paid=false
GET /api/admin/maintenance/?month=2025-03&is_paid=false
```

**Response (200):**
```json
[
  {
    "id": 1,
    "vendor": 5,
    "vendor_name": "Organic Farms",
    "vendor_email": "john@organicfarms.com",
    "month": "2025-03",
    "amount": "499.00",
    "is_paid": true,
    "paid_on": "2025-03-05",
    "payment_reference": "UTR123456789",
    "created_at": "2025-02-25T08:00:00Z"
  },
  {
    "id": 2,
    "vendor": 7,
    "vendor_name": "Natural Skincare Co",
    "vendor_email": "jane@naturalskincare.com",
    "month": "2025-03",
    "amount": "499.00",
    "is_paid": false,
    "paid_on": null,
    "payment_reference": "",
    "created_at": "2025-02-25T08:00:00Z"
  }
]
```

**Filtering Logic:**
- `is_paid=true` or `is_paid=yes` or `is_paid=1` → boolean true
- `is_paid=false` or `is_paid=no` or `is_paid=0` → boolean false
- All filters are combined with AND logic

---

### 3. Maintenance Fee Details
**GET** `/api/admin/maintenance/<id>/`

Get full details for a specific maintenance fee record.

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
  "month": "2025-03",
  "amount": "499.00",
  "is_paid": true,
  "paid_on": "2025-03-05",
  "payment_reference": "UTR123456789",
  "notes": "Payment received via UPI",
  "created_at": "2025-02-25T08:00:00Z"
}
```

**Error Examples:**
- 404: `{"detail": "Maintenance fee with id 999 not found."}`

---

### 4. Mark Fee as Paid
**PATCH** `/api/admin/maintenance/<id>/mark-paid/`

Record a maintenance fee payment.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "payment_reference": "UTR123456789",
  "paid_on": "2025-03-05"
}
```

**Response (200):**
```json
{
  "message": "Maintenance fee 1 marked as paid.",
  "fee_id": 1,
  "vendor": "Organic Farms",
  "month": "2025-03",
  "amount": "499.00",
  "is_paid": true,
  "paid_on": "2025-03-05",
  "payment_reference": "UTR123456789"
}
```

**Details:**
- Sets `is_paid=True`
- Records `paid_on` date
- Stores `payment_reference` (typically vendor's UTR/transaction ID)
- Updates the record in database

**Error Examples:**
- 400: `{"payment_reference": ["This field is required."]}`
- 400: `{"paid_on": ["This field is required."]}`
- 404: `{"detail": "Maintenance fee with id 999 not found."}`

---

### 5. Maintenance Summary
**GET** `/api/admin/maintenance/summary/`

Get monthly summary of fees: expected vs collected amounts, collection rate.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `month=YYYY-MM` (optional) — Get summary for single month only

**Examples:**
```
GET /api/admin/maintenance/summary/
GET /api/admin/maintenance/summary/?month=2025-03
```

**Response (200) — All Months:**
```json
[
  {
    "month": "2025-03",
    "total_vendors": 17,
    "total_expected": 8483,
    "total_collected": 7484,
    "total_pending": 999,
    "collection_rate": 88.23
  },
  {
    "month": "2025-02",
    "total_vendors": 16,
    "total_expected": 7984,
    "total_collected": 7984,
    "total_pending": 0,
    "collection_rate": 100.0
  }
]
```

**Response (200) — Single Month:**
```json
[
  {
    "month": "2025-03",
    "total_vendors": 17,
    "total_expected": 8483,
    "total_collected": 7484,
    "total_pending": 999,
    "collection_rate": 88.23
  }
]
```

**Field Explanations:**
- `total_vendors` — Count of vendors with fees for this month
- `total_expected` — Sum of all amounts for the month
- `total_collected` — Sum of amounts marked as paid
- `total_pending` — Sum of unpaid amounts (total_expected - total_collected)
- `collection_rate` — Percentage of fees collected (0-100), rounded to 2 decimals

**Ordering:**
- Results ordered by month descending (newest first) when fetching all months
- Single month query still returns as array with 1 element for consistency

---

## Workflow Example: Monthly Fee Collection

### Step 1: Generate Fees for March
```bash
POST /api/admin/maintenance/generate/
{
  "month": "2025-03",
  "amount": 499
}
```
→ Creates MaintenanceFee record for all 17 active vendors

### Step 2: Check Outstanding Fees
```bash
GET /api/admin/maintenance/?month=2025-03&is_paid=false
```
→ Lists all unpaid fees for March (17 records initially)

### Step 3: Monitor Payments
```bash
GET /api/admin/maintenance/summary/?month=2025-03
```
→ Shows collection progress (e.g., 5 paid, 12 pending)

### Step 4: Record Payment from Vendor
```bash
PATCH /api/admin/maintenance/5/mark-paid/
{
  "payment_reference": "UTR20250305001",
  "paid_on": "2025-03-05"
}
```
→ Updates fee record, sets is_paid=True

### Step 5: Track Progress
```bash
GET /api/admin/maintenance/summary/?month=2025-03
```
→ Summary now shows 6 paid, 11 pending (88.24% collected)

---

## Field Formatting

### Month Format
- Format: `YYYY-MM` (e.g., "2025-03", "2024-12")
- Used as string for flexibility and readability
- Indexed for fast filtering
- Unique constraint with vendor prevents duplicates

### Payment Reference
- Typically vendor's UPI transaction ID, bank UTR, or reference number
- Free-form string, max 120 characters
- Optional during fee generation, required when marking as paid

### Amount
- Decimal field with 10 total digits, 2 decimal places
- Supports currency calculations without floating-point errors
- Default 500 (can be overridden per generation)
- Validated to be > 0

---

## Status Fields

### is_paid
- `false` — Fee outstanding/unpaid (default on creation)
- `true` — Fee received/collected, with paid_on and payment_reference set

### Indexed for Performance
- `(month, is_paid)` — Fast filtering by "unpaid fees this month"
- `(vendor, is_paid)` — Fast filtering by "unpaid fees for specific vendor"

---

## Use Cases

### Collection Dashboard
Admin dashboard showing:
- Fees due this month: `GET /api/admin/maintenance/?month=YYYY-MM&is_paid=false`
- Collection rate this month: `GET /api/admin/maintenance/summary/?month=YYYY-MM`
- Vendor payment history: `GET /api/admin/maintenance/?vendor_id=123`

### Payment Recording
When vendor pays via NEFT/UPI:
1. Verify payment in bank records
2. Call `PATCH /api/admin/maintenance/<id>/mark-paid/` with transaction ID
3. Fee record updated, appears in collected amounts

### Month-End Reconciliation
1. Get summary: `GET /api/admin/maintenance/summary/?month=YYYY-MM`
2. Review collection_rate
3. Notify vendors with outstanding fees
4. Generate next month's fees: `POST /api/admin/maintenance/generate/` with new month

### Vendor-Specific Tracking
Track which vendors have paid (or not):
```
GET /api/admin/maintenance/?vendor_id=5
```
Shows all historical fees for vendor 5, payment status, and dates

---

## ERROR HANDLING

| Status | Scenario |
|--------|----------|
| 400 | Invalid month format or negative amount |
| 401 | Missing/invalid admin token |
| 401 | Token not admin role (not admin) |
| 404 | MaintenanceFee record not found |
| 500 | Server error |

---

## INTEGRATION WITH VENDOR MODEL

When using the vendor deactivation or vendor maintenance APIs:

1. **AdminVendorMaintenanceView** — Updates `vendor.maintenance_due` flag
   - This is a simple True/False indicator
   
2. **MaintenanceFee** — Detailed record of monthly fees
   - Tracks individual month fees
   - Records payment dates and references
   - Enables reporting and revenue tracking

**Why Both?**
- `Vendor.maintenance_due` — Quick flag for vendor dashboard/status display
- `MaintenanceFee` — Detailed audit trail for admin reporting/reconciliation

---

## MIGRATION INFO

Migration: `admins/migrations/0002_maintenancefee.py`
- Creates `admins_maintenancefee` table (PostgreSQL compatible)
- Adds foreign key to vendors_vendor (CASCADE)
- Creates indexes on (month, is_paid) and (vendor, is_paid)
- Unique constraint on (vendor_id, month)

To apply: `python manage.py migrate admins`

---

## FUTURE ENHANCEMENTS

Potential additions:
- `POST /api/admin/maintenance/bulk-mark-paid/` — Mark multiple fees paid at once
- `GET /api/admin/maintenance/overdue/` — List fees overdue by X days
- `POST /api/admin/maintenance/<id>/send-payment-reminder/` — Email vendor about unpaid fee
- `DELETE /api/admin/maintenance/<id>/` — Soft-delete fee (cancel charge)
- `PATCH /api/admin/maintenance/<id>/` — Update amount/notes for existing fee
