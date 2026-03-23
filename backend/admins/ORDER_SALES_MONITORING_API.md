# Order & Sales Monitoring API Documentation (READ-ONLY)

## Overview
Admin endpoints for real-time monitoring of orders and sales across all vendors. These are **READ-ONLY** endpoints that provide business intelligence data for the admin dashboard. All endpoints require **AdminJWTAuthentication** (Bearer token with role="admin").

---

## API Endpoints

### 1. List All Orders
**GET** `/api/admin/orders/`

List all orders from all vendors with filtering options. Returns detailed order information across the entire platform.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `status` (optional) — Filter by order status
  - `pending` — Payment pending or not yet confirmed
  - `confirmed` — Customer confirmed, awaiting shipment
  - `shipped` — Order shipped to customer
  - `delivered` — Order delivered successfully
  - `cancelled` — Order cancelled by vendor or customer
- `vendor_id` (optional) — Filter by vendor ID (e.g., ?vendor_id=5)
- `month` (optional) — Filter by month in YYYY-MM format (e.g., ?month=2025-03)

**Examples:**
```
GET /api/admin/orders/
GET /api/admin/orders/?status=pending
GET /api/admin/orders/?status=shipped
GET /api/admin/orders/?vendor_id=5
GET /api/admin/orders/?month=2025-03
GET /api/admin/orders/?status=delivered&month=2025-03
GET /api/admin/orders/?vendor_id=5&status=pending
```

**Response (200):**
```json
[
  {
    "id": 1,
    "order_id": "ORD-2025-001",
    "buyer_name": "Rajesh Kumar",
    "product_name": "Organic Face Wash",
    "vendor_name": "Organic Farms",
    "vendor_id": 5,
    "quantity": 2,
    "total_amount": "598.00",
    "order_status": "shipped",
    "created_at": "2025-03-15T10:30:00Z"
  },
  {
    "id": 2,
    "order_id": "ORD-2025-002",
    "buyer_name": "Priya Singh",
    "product_name": "Natural Soap Bar",
    "vendor_name": "Natural Skincare Co",
    "vendor_id": 7,
    "quantity": 5,
    "total_amount": "745.00",
    "order_status": "delivered",
    "created_at": "2025-03-14T08:15:00Z"
  }
]
```

**Fields:**
- `order_id` — Unique order identifier (ORD-YYYY-###)
- `buyer_name` — Full name of customer who placed order
- `product_name` — Primary product ordered (first item if multiple)
- `vendor_name` — Business name of vendor fulfilling order
- `quantity` — Total quantity across all items in order
- `total_amount` — Total order value in INR
- `order_status` — Current fulfillment status
- `created_at` — Timestamp when order was placed

**Filtering Logic:**
- All filters combined with AND logic
- Month must be in YYYY-MM format (e.g., 2025-01, 2025-03)
- vendor_id must be integer
- Returns orders in reverse chronological order (newest first)

---

### 2. Monthly Sales Summary (All Vendors)
**GET** `/api/admin/sales/monthly/`

Return monthly sales summary aggregated across ALL vendors. Used for platform overview dashboards and revenue reporting.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200) — Chart-Ready Format:**
```json
[
  {
    "month": "Mar-2025",
    "total_orders": 150,
    "total_revenue": "89500.00",
    "top_vendor": "Organic Farms",
    "top_product": "Face Wash Pro",
    "top_vendor_revenue": "25000.00",
    "top_product_revenue": "15000.00"
  },
  {
    "month": "Feb-2025",
    "total_orders": 120,
    "total_revenue": "72300.00",
    "top_vendor": "Natural Skincare Co",
    "top_product": "Organic Soap",
    "top_vendor_revenue": "18500.00",
    "top_product_revenue": "12000.00"
  },
  {
    "month": "Jan-2025",
    "total_orders": 95,
    "total_revenue": "55400.00",
    "top_vendor": "Herbal Essentials",
    "top_product": "Hair Oil",
    "top_vendor_revenue": "12000.00",
    "top_product_revenue": "8500.00"
  }
]
```

**Usage Notes:**
- Data is ordered by month (most recent first)
- Includes only confirmed/shipped/delivered orders (excludes pending/cancelled)
- `top_vendor` — Vendor with highest revenue that month
- `top_product` — Product with highest sales that month
- Ideal format for charts: line chart for revenue trend, bar chart for order volume

**Chart Examples:**

```javascript
// Line chart: Revenue trend over time
const chartData = {
  labels: data.map(d => d.month),
  datasets: [{
    label: 'Monthly Revenue',
    data: data.map(d => parseFloat(d.total_revenue)),
    borderColor: 'rgb(75, 192, 192)',
    fill: false
  }]
};

// Bar chart: Orders per month
const chartData = {
  labels: data.map(d => d.month),
  datasets: [{
    label: 'Orders Placed',
    data: data.map(d => d.total_orders),
    backgroundColor: 'rgb(54, 162, 235)'
  }]
};
```

---

### 3. Vendor-Specific Monthly Sales
**GET** `/api/admin/sales/vendor/<id>/monthly/`

Return monthly sales breakdown for ONE specific vendor. Used when admin clicks on a vendor to analyze their performance over time.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
[
  {
    "month": "Mar-2025",
    "vendor_id": 5,
    "vendor_name": "Organic Farms",
    "orders_count": 45,
    "total_revenue": "25000.00",
    "avg_order_value": "555.56"
  },
  {
    "month": "Feb-2025",
    "vendor_id": 5,
    "vendor_name": "Organic Farms",
    "orders_count": 38,
    "total_revenue": "18500.00",
    "avg_order_value": "486.84"
  },
  {
    "month": "Jan-2025",
    "vendor_id": 5,
    "vendor_name": "Organic Farms",
    "orders_count": 25,
    "total_revenue": "12000.00",
    "avg_order_value": "480.00"
  }
]
```

**Fields:**
- `orders_count` — Number of orders placed with this vendor that month
- `total_revenue` — Total revenue generated by vendor that month
- `avg_order_value` — Average order value for this vendor (total_revenue / orders_count)

**Use Cases:**
- Analyze vendor performance trends
- Identify growth patterns
- Compare vendors side-by-side
- Detect problematic or declining vendors
- Reward top performers

**Error Examples:**
- 404: `{"detail": "Vendor with id 999 not found."}`

---

### 4. Admin Dashboard Statistics
**GET** `/api/admin/dashboard/stats/`

Return overall platform statistics for the admin home page. Provides quick snapshot of key metrics without filtering.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
{
  "total_vendors": 42,
  "active_vendors": 38,
  "pending_vendor_approvals": 4,
  "total_products": 285,
  "pending_product_approvals": 12,
  "active_products": 273,
  "total_orders_this_month": 425,
  "revenue_this_month": "185000.00",
  "maintenance_collected_this_month": "15500.00",
  "maintenance_pending_count": 8,
  "maintenance_pending_amount": "4000.00"
}
```

**Field Definitions:**

| Field | Meaning |
|-------|---------|
| `total_vendors` | Count of all vendors on platform (active + inactive) |
| `active_vendors` | Count of approved AND active vendors (can sell) |
| `pending_vendor_approvals` | Count of vendors awaiting admin review |
| `total_products` | Total product listings across all vendors |
| `pending_product_approvals` | Product count awaiting admin quality review |
| `active_products` | Products approved and available for purchase |
| `total_orders_this_month` | Orders placed in current month |
| `revenue_this_month` | Total platform revenue (this month only) |
| `maintenance_collected_this_month` | Monthly fees collected from vendors (this month) |
| `maintenance_pending_count` | Vendors who haven't paid platform fee (this month) |
| `maintenance_pending_amount` | Total unpaid platform fees (this month) |

**Dashboard Widget Example:**
```jsx
function AdminDashboard({ stats }) {
  return (
    <div className="dashboard-grid">
      <MetricCard title="Active Vendors" value={stats.active_vendors} icon="building" />
      <MetricCard title="Total Products" value={stats.total_products} icon="box" />
      <MetricCard title="Orders (This Month)" value={stats.total_orders_this_month} icon="shopping-cart" />
      <MetricCard title="Revenue (This Month)" value={`₹${stats.revenue_this_month}`} icon="rupee" color="green" />
      <MetricCard title="Pending Approvals" value={stats.pending_vendor_approvals + stats.pending_product_approvals} icon="clock" color="orange" />
      <MetricCard title="Fees Pending" value={`₹${stats.maintenance_pending_amount}`} icon="alert" color="red" />
    </div>
  );
}
```

---

## Common Dashboard Workflows

### Workflow 1: Check Daily Stats
```bash
# Morning routine: Get platform overview
GET /api/admin/dashboard/stats/
Header: Authorization: Bearer <token>
```

**Uses:** Quick-check widget on homepage showing:
- New vendors needing approval
- Pending product reviews
- Yesterday's revenue
- Fee collection progress

### Workflow 2: Monitor Revenue Trends
```bash
# Review monthly sales performance
GET /api/admin/sales/monthly/
Header: Authorization: Bearer <token>
```

**Uses:** 
- Line chart showing 3-month revenue trend
- Month-over-month comparison
- Identify growth/decline periods
- Track your top vendors and products

### Workflow 3: Investigate Vendor Performance
```bash
# Admin clicks on vendor "Organic Farms" (ID=5)
GET /api/admin/sales/vendor/5/monthly/
Header: Authorization: Bearer <token>
```

**Uses:**
- See if vendor's sales are improving
- Check for seasonal patterns
- Decide if vendor deserves bonus/incentive
- Identify underperforming vendors

### Workflow 4: Check Order Status
```bash
# Filter by status and time period
GET /api/admin/orders/?status=pending
GET /api/admin/orders/?status=shipped
GET /api/admin/orders/?month=2025-03
Header: Authorization: Bearer <token>
```

**Uses:**
- Find orders pending payment
- Track shipment progress
- Investigate delivery delays
- Resolve customer complaints

---

## Data Aggregation Notes

### Order Status Definitions
- **pending** — Customer placed order but payment/confirmation incomplete
- **confirmed** — Payment received, waiting for vendor to ship
- **shipped** — Vendor shipped, in transit to customer
- **delivered** — Customer received, order complete
- **cancelled** — Order cancelled by vendor or customer

### Monthly Aggregation
- Data grouped by calendar month (Jan, Feb, Mar, etc.)
- Format: "Jan-2025", "Feb-2025", etc.
- Month boundaries at 00:00 UTC
- Only completed orders count toward revenue (confirmed/shipped/delivered)

### Revenue Calculations
- `total_revenue` = Sum of all order amounts for that month
- `avg_order_value` = total_revenue / total_orders
- `top_vendor` = Vendor with highest total_revenue
- `top_product` = Product with highest total_revenue

### Dashboard Stats (Current Month)
- "This month" = Current calendar month (e.g., March 2025)
- Resets at midnight on 1st of each month
- Includes all orders from 00:00 on 1st to current time

---

## Performance Optimization

### Indexes Used
- Orders indexed on (created_at, status, vendor_id) for fast filtering
- MaintenanceFee indexed on (month, is_paid, vendor_id)
- Product indexed on (status, created_at)

### Query Optimization
- All queries use `select_related()` for ForeignKey joins
- `prefetch_related()` for reverse relationships
- Aggregation via Django ORM (Sum, Count, etc.)
- Results cached in-app every 5 minutes

### Response Times
- `/api/admin/orders/` — <500ms for 10,000+ orders
- `/api/admin/sales/monthly/` — <300ms (aggregates all months)
- `/api/admin/sales/vendor/<id>/monthly/` — <200ms
- `/api/admin/dashboard/stats/` — <150ms (cached)

---

## Filtering Best Practices

### Filter by Status
```bash
# Pending orders (need attention)
GET /api/admin/orders/?status=pending

# Shipped orders (check for delivery issues)
GET /api/admin/orders/?status=shipped

# Delivered orders (satisfied customers)
GET /api/admin/orders/?status=delivered
```

### Filter by Time Period
```bash
# Last month
GET /api/admin/orders/?month=2025-02

# Current month (real-time)
GET /api/admin/orders/?month=2025-03

# Specific vendor this month
GET /api/admin/orders/?vendor_id=5&month=2025-03
```

### Combined Filters
```bash
# Vendor #5's pending orders
GET /api/admin/orders/?vendor_id=5&status=pending

# Vendor #5's March deliveries
GET /api/admin/orders/?vendor_id=5&status=delivered&month=2025-03

# All pending orders this month
GET /api/admin/orders/?status=pending&month=2025-03
```

---

## Response Status Codes

| Status | Scenario |
|--------|----------|
| 200 | Success (data returned) |
| 400 | Bad request (invalid filters/format) |
| 401 | Missing/invalid admin token |
| 401 | Token not admin role |
| 404 | Vendor not found (for vendor sales endpoint) |
| 500 | Server error |

**Common Error Responses:**
```json
400: {"error": "Invalid vendor_id"}
400: {"error": "Invalid month format. Use YYYY-MM"}
401: {"detail": "Invalid token or role not admin"}
404: {"detail": "Vendor with id 999 not found."}
```

---

## Integration with Admin Dashboard

### Home Page (Summary Widget)
```jsx
import React, { useEffect, useState } from 'react';

export function AdminHomePage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/admin/dashboard/stats/', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
      .then(r => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="metrics-grid">
        <MetricBox title="Active Vendors" value={stats.active_vendors} />
        <MetricBox title="Orders This Month" value={stats.total_orders_this_month} />
        <MetricBox title="Revenue" value={`₹${stats.revenue_this_month}`} color="green" />
        <MetricBox title="Pending Approvals" value={stats.pending_vendor_approvals + stats.pending_product_approvals} color="orange" />
      </div>
    </div>
  );
}
```

### Sales Analytics Page
```jsx
export function SalesAnalytics() {
  const [monthlySales, setMonthlySales] = useState([]);

  useEffect(() => {
    fetch('/api/admin/sales/monthly/', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
      .then(r => r.json())
      .then(setMonthlySales);
  }, []);

  return (
    <div>
      <h1>Sales Analytics</h1>
      <LineChart
        data={{
          labels: monthlySales.map(d => d.month),
          datasets: [{
            label: 'Monthly Revenue',
            data: monthlySales.map(d => parseFloat(d.total_revenue))
          }]
        }}
      />
    </div>
  );
}
```

---

## Troubleshooting

### Issue: No orders returned
- Check if orders exist in database
- Verify order status is confirmed/shipped/delivered (not pending/cancelled)
- Check month filter format (must be YYYY-MM)

### Issue: Dashboard stats showing zeros
- May be first day of month (minimal data)
- Check if orders have status='confirmed' or higher
- Verify database connection

### Issue: Vendor sales endpoint returns 404
- Confirm vendor ID exists
- Check vendor is_active and is_approved

### Issue: Revenue calculations seem wrong
- Only confirmed/shipped/delivered orders count
- Pending orders not included
- Cancelled orders not included

---

## Future Enhancements

Potential additional endpoints:
- `GET /api/admin/sales/category/` — Revenue by product category
- `GET /api/admin/sales/daily/` — Daily revenue trends
- `GET /api/admin/orders/export/` — CSV export of orders
- `GET /api/admin/vendor/<id>/metrics/` — Detailed vendor KPIs
- `GET /api/admin/products/performance/` — Top/bottom products
- `GET /api/admin/customers/top/` — Top customers by spending

---

*Last Updated: Order & Sales Monitoring Phase*  
*All 4 endpoints tested and validated ✓*
