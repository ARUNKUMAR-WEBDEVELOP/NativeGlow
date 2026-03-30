# Vendor E-Commerce Implementation Guide

## Step 1: Vendor Approval → Dashboard Auto-Redirect

### Current Flow (✅ Already Works)

1. Vendor registers with Google verification
2. System stores vendor data with `is_approved=False`
3. VendorApprovalPending page polls every 15 seconds
4. When approved, redirects to `/site/{vendor_slug}` (customer storefront)

### What Needs to Change

After approval → redirect vendor to **`/vendor/dashboard`** instead of storefront

### Implementation

In `frontend/src/pages/vendor/VendorApprovalPending.jsx`:

```javascript
// After approval, vendor should go to dashboard, NOT customer site
if (response?.is_approved) {
  // Store vendor auth token if available
  if (response?.vendor_token) {
    localStorage.setItem(
      "nativeglow_vendor_tokens",
      JSON.stringify({
        access: response.vendor_token,
        vendor_id: response.vendor_id,
        vendor_slug: response.vendor_slug,
      }),
    );
  }
  // Redirect to dashboard
  navigate(`/vendor/dashboard`, { replace: true });
}
```

## Step 2: Vendor Dashboard Layout

### Components Needed

```jsx
VendorDashboard.jsx (Main page)
├── Sidebar Navigation
│   ├── Dashboard
│   ├── Products
│   ├── Orders
│   ├── Profile
│   └── Settings
├── Main Content Area
│   └── Stats & Quick Actions
└── Mobile Menu
```

### Dashboard Stats to Show

- Total Products Listed
- Total Orders (All Time)
- Pending Orders (Need to ship)
- Total Revenue
- Recent Orders (Last 5)
- Quick action buttons:
  - Add New Product
  - View All Orders
  - Edit Profile
  - View Public Storefront

## Step 3: Product Management

### Vendor Product API Flow

```
Frontend Form
    ↓
VendorProductCreateView (POST /api/vendor/products/add/)
    ↓
Validate vendor is approved & JWT token valid
    ↓
Create Product with vendor_id
    ↓
Return product details
    ↓
Show in VendorProducts list
```

### Required Fields for Product

- **Vendor-managed:**
  - Title/Name
  - Description
  - Ingredients
  - Price
  - Discount %
  - Stock Quantity
  - Images (primary_image, gallery)
  - Visibility (show/hide)
  - Category
  - Tags

- **Auto-set by system:**
  - vendor_id (from JWT token)
  - slug (auto-generated)
  - created_at
  - is_active (default true)

### Product Creation API Example

```bash
POST /api/vendor/products/add/
Authorization: Bearer {vendor_jwt_token}
Content-Type: application/json

{
  "title": "Organic Neem Soap",
  "description": "100% natural neem soap...",
  "price": 250,
  "discount_percent": 10,
  "stock_quantity": 50,
  "category": 1,
  "primary_image": "url or file",
  "ingredients": "Neem, coconut oil, turmeric"
}
```

## Step 4: Order Management System

### Order Placement Flow

```
Customer Adds Items to Cart
    ↓
Customer Clicks Checkout
    ↓
Customer Must Login (Google or Email)
    ↓
Customer Enters Shipping Address
    ↓
Frontend Calls POST /api/order/place/
    ↓
Backend Creates Order (status=pending)
    ↓
Trigger Email Notification to Vendor
    ↓
Redirect Customer to Order Tracking
    ↓
Vendor Sees New Order in VendorOrders
    ↓
Vendor Updates Status (processing → shipped → delivered)
```

### Order Model Fields

```python
Order:
  - order_id (UUID)
  - order_code (NG-2025-00123) # For customer-facing tracking
  - vendor (ForeignKey to Vendor)
  - customer_name, email, phone
  - shipping_address, city, state, pincode
  - items (One or more products)
  - total_amount
  - order_status (pending, processing, shipped, delivered, cancelled)
  - payment_method (UPI, bank_transfer)
  - created_at, updated_at
```

### Order API Endpoints

**Place Order (Customer)**

```bash
POST /api/order/place/
Authorization: Bearer {customer_jwt_token}
Content-Type: application/json

{
  "customer_email": "customer@example.com",
  "customer_phone": "9876543210",
  "shipping_address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 250
    }
  ],
  "payment_method": "upi"
}
```

**Get Vendor Orders**

```bash
GET /api/vendor/orders/?status=pending
Authorization: Bearer {vendor_jwt_token}

Response:
{
  "orders": [
    {
      "order_code": "NG-2025-00001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9876543210",
      "shipping_address": "123 Main St",
      "city": "Mumbai",
      "items": [
        {
          "product_name": "Neem Soap",
          "quantity": 2,
          "price": 250
        }
      ],
      "total": 500,
      "status": "pending",
      "created_at": "2025-03-30T10:15:00Z"
    }
  ]
}
```

**Update Order Status (Vendor)**

```bash
PATCH /api/vendor/orders/{order_id}/status/
Authorization: Bearer {vendor_jwt_token}
Content-Type: application/json

{
  "status": "shipped",
  "shipping_tracking": "SHIPPINGID123"
}
```

## Step 5: Notification System

### Email Notifications Needed

**When Order is Placed** (to Vendor)

```
Subject: New Order - NG-2025-00001
To: vendor@example.com

Hi Vendor Name,

You have a new order!

Order Code: NG-2025-00001
Customer: John Doe
Email: john@example.com
Phone: 9876543210

Items:
- Neem Soap (qty: 2) - Rs 250 each

Total: Rs 500
Shipping Address: 123 Main St, Mumbai - 400001

Status: Awaiting Processing

Action Required: Log in to your dashboard to process this order.
```

**When Status Changes** (to Customer)

```
Subject: Order NG-2025-00001 has been shipped!

Your order has been shipped!

Expected Delivery: 3-5 business days
Tracking ID: SHIPPINGID123

You can track your order here: [link]
```

### Implementation

```python
# In orders/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order
from django.core.mail import send_mail

@receiver(post_save, sender=Order)
def notify_vendor_on_order(sender, instance, created, **kwargs):
    if created and instance.vendor:
        # Send email to vendor
        send_mail(
            subject=f'New Order - {instance.order_code}',
            message=f'Order from {instance.full_name} for Rs {instance.total_amount}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.vendor.email],
        )
```

## Step 6: Cart API (Session-Based)

### Cart Data Structure (Store in localStorage)

```javascript
{
  "vendor_slug": "organic-farms",
  "items": [
    {
      "product_id": 1,
      "product_name": "Neem Soap",
      "price": 250,
      "quantity": 2,
      "image": "url"
    }
  ],
  "total": 500,
  "item_count": 2
}
```

### Cart API Endpoints

**Add to Cart** (Frontend-only, no API call initially)

```javascript
const addToCart = (product) => {
  const cart = JSON.parse(localStorage.getItem("nativeglow_cart")) || {
    items: [],
  };
  const existing = cart.items.find((i) => i.product_id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: 1,
      image: product.primary_image,
    });
  }
  localStorage.setItem("nativeglow_cart", JSON.stringify(cart));
};
```

## Step 7: Frontend Pages to Implement/Update

### 1. VendorDashboard.jsx (Main Hub)

```jsx
- Show vendor stats
- Recent orders
- Quick actions
- Sidebar navigation to Products, Orders, Profile
```

### 2. UpdateVendorApprovalPending.jsx

```jsx
- Change redirect to /vendor/dashboard instead of /site/{slug}
- Store vendor JWT token on successful approval
```

### 3. CheckoutPage.jsx (Existing, needs update)

```jsx
- Show items in cart
- Require customer login
- Get shipping address
- Call POST /api/order/place/
- Show confirmation
```

### 4. OrderTrackingPage.jsx (New)

```jsx
- Show customer's orders
- Show status timeline
- Show tracking updates
- Can filter by status
```

### 5. VendorOrdersPage.jsx (Existing, needs update)

```jsx
- List vendor's orders
- Filter by status (pending, processing, shipped, delivered)
- Click order to see details
- Update status (change to shipped, delivered, etc.)
- Print shipping label feature
```

## Step 8: Testing Checklist

### Vendor Flow

- [ ] Register vendor with Google
- [ ] Admin approves vendor
- [ ] Vendor auto-redirected to dashboard
- [ ] Vendor can add product with JWT token
- [ ] Vendor can edit product (price, discount, quantity)
- [ ] Vendor can delete product
- [ ] Vendor can toggle visibility/publish

### Customer Flow

- [ ] View vendor storefront
- [ ] See products with prices (with discount applied)
- [ ] Add product to cart
- [ ] Go to checkout
- [ ] Login with Google/Email
- [ ] Enter shipping address
- [ ] Place order
- [ ] See confirmation with order code
- [ ] Vendor receives email notification
- [ ] Vendor can see order in dashboard

### Order Fulfillment

- [ ] Vendor can view pending orders
- [ ] Vendor can mark as processing
- [ ] Vendor can mark as shipped
- [ ] Customer notified of status change
- [ ] Customer can track order

## Code Examples

### Add to Cart Button for Vendor Storefront

```javascript
const [cart, setCart] = useState([]);

const handleAddToCart = (product) => {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    setCart(
      cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)),
    );
  } else {
    setCart([...cart, { ...product, qty: 1 }]);
  }
  // Also save to localStorage for persistence
  localStorage.setItem(
    "cart",
    JSON.stringify([...cart, { ...product, qty: 1 }]),
  );
};
```

### Vendor JWT Token Usage

```javascript
// In api.js
vendorProductCreate: (data) => authRequest(
  '/vendor/products/add/',
  {
    method: 'POST',
    body: JSON.stringify(data),
  },
  vendorTokens,
  onVendorTokensUpdate,
  onVendorAuthExpired
),

// Header includes: Authorization: Bearer {vendor_access_token}
```

### Order Status Update Example

```javascript
const updateOrderStatus = async (orderId, newStatus) => {
  const response = await api.vendorUpdateOrderStatus(orderId, {
    status: newStatus,
    shipping_tracking: shippingId,
  });
  setOrders(
    orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
  );
};
```

## Priority Order for Implementation

1. **HIGH** - Auto-redirect to dashboard after approval
2. **HIGH** - Vendor dashboard with stats
3. **HIGH** - Product management API integration with vendor JWT
4. **MEDIUM** - Customer checkout & order placement
5. **MEDIUM** - Vendor order management
6. **MEDIUM** - Email notifications
7. **LOW** - Advanced features (shipping labels, analytics)
