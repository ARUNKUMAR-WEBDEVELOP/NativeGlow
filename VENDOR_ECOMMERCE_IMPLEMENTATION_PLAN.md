# Vendor E-Commerce Platform - Implementation Plan

## Overview

Complete vendor e-commerce system where:

- **Vendors** manage products, prices, discounts, inventory, and fulfill orders
- **Customers** browse vendor storefronts, purchase products, track orders, and login with Google
- **Notification system** alerts vendors when orders are placed
- **Fulfillment system** tracks shipping status

## Architecture

### 1. Vendor Dashboard Flow

```
Registration → Pending Approval → Admin Approves → Auto-Redirect to /vendor/dashboard/{vendor_id}
                                                  → Can manage products, prices, discounts, inventory
                                                  → View orders & notifications
                                                  → Handle shipping
```

### 2. Customer Storefront Flow

```
Browse /site/{vendor-slug}/ → View Products → Add to Cart → Login (Google/Email)
→ Checkout → Place Order → Vendor notified → Track order status
```

### 3. Database Models (Already Created)

- `Product` - has `vendor_id` ForeignKey
- `Order` - tracks customer, vendor, items, status
- `Vendor` - vendor account with approval status

## Implementation Tasks

### Phase 1: Vendor Dashboard Auto-Redirect ✅

- Modify VendorApprovalPending to redirect to `/vendor/dashboard` after approval
- Create VendorDashboard main page routing

### Phase 2: Vendor Product Management ✅

- VendorProductCreateView (add products)
- VendorProductListView (list vendor's products)
- VendorProductEditView (edit price, discount, quantity, visibility)
- VendorProductDeleteView (remove products)
- VendorProductStatusView (publish/unpublish)
- VendorProductQuantityView (manage stock)
- VendorProductDiscountView (set discounts)

### Phase 3: Customer Cart & Order Placement

- Cart API: Add/remove/update items
- Order placement API: Create order from cart
- Auth required: Customer must login to place order
- Email confirmation for orders

### Phase 4: Vendor Order Management

- VendorOrderListView - show orders for vendor's products
- VendorOrderStatusUpdateView - update status (pending → processing → shipped → delivered)
- Order notifications (email/webhook when order placed)
- Tracking page for customers

### Phase 5: Customer Features

- Login with Google
- Add products to cart
- Checkout with shipping address
- Order tracking page
- Email notifications on status change

## API Endpoints (Already Defined)

### Vendor Management

```
POST   /api/vendor/register/           - Register vendor
POST   /api/vendor/login/              - Vendor login
GET    /api/vendor/me/                 - Get vendor profile
GET    /api/vendor/approval-status/    - Check approval status
```

### Vendor Products

```
POST   /api/vendor/products/add/       - Create product
GET    /api/vendor/products/           - List vendor's products
PATCH  /api/vendor/products/{id}/      - Edit product
DELETE /api/vendor/products/{id}/delete/ - Delete product
PATCH  /api/vendor/products/{id}/quantity/ - Update stock
PATCH  /api/vendor/products/{id}/discount/ - Set discount
PATCH  /api/vendor/products/{id}/status/  - Publish/Unpublish
PATCH  /api/vendor/products/{id}/visibility/ - Toggle visibility
```

### Vendor Orders

```
GET    /api/vendor/orders/             - List vendor's orders
PATCH  /api/vendor/orders/{id}/status/ - Update order status
```

### Public Storefront

```
GET    /api/site/{vendor_slug}/        - Vendor storefront home
GET    /api/site/{vendor_slug}/products/ - Vendor's products
GET    /api/site/{vendor_slug}/about/  - Vendor about page
```

### Customer Orders

```
POST   /api/order/place/               - Place order (requires auth)
GET    /api/order/{order_code}/status/ - Track order status
```

## Frontend Routes

### Vendor Routes

```
/vendor/register                - Registration (public)
/vendor/login                   - Vendor login (public)
/vendor/approval-pending        - Waiting for approval (public)
/vendor/dashboard               - Main vendor dashboard (protected)
/vendor/products                - Manage products (protected)
/vendor/products/add            - Add new product (protected)
/vendor/orders                  - View orders (protected)
/vendor/profile                 - Edit vendor profile (protected)
```

### Customer Routes

```
/site/{vendor-slug}/            - Vendor storefront (public)
/site/{vendor-slug}/products    - Product listing (public)
/site/{vendor-slug}/about       - About vendor (public)
/orders                         - My orders (protected)
/orders/{order-code}            - Track order (protected)
/checkout                       - Checkout (protected)
```

## Current Status of Components

### ✅ Completed

- Vendor registration with Google verification
- Vendor approval system
- Vendor authentication (login with auto-generated password)
- Product model with vendor relationship
- Order model with customer details
- API routes defined
- Frontend pages created

### ⏳ In Progress

- Auto-redirect to dashboard after approval
- Order placement & tracking
- Vendor notifications
- Cart functionality

### 📋 Planned

- Email notifications
- Shipping label generation
- Payment integration
- Analytics dashboard

## Next Steps

1. **Implement auto-redirect** to vendor dashboard after approval ✅
2. **Test product management APIs** with vendor JWT tokens
3. **Implement customer cart API** (in-memory or session-based initially)
4. **Implement order placement API** with authentication requirement
5. **Create order notification system** (email + webhook)
6. **Create vendor order tracking UI**
7. **Create customer order tracking UI**
8. **Add shipping status management**

## Technical Notes

### Authentication

- Vendors use JWT tokens (generated by VendorLoginView)
- Customers use Django User model with Google OAuth
- Both required for operations (product creation, order placement)

### Notifications

- Use Django signals to trigger on Order creation
- Send email to vendor about new order
- Later: Add WebSocket for real-time notifications

### Cart Strategy

- Session-based cart initially (simpler, no DB)
- Later: Database-backed cart for persistent across sessions

### Product Pricing

- Base price stored in Product.price
- Discount percent stored in Product.discount_percent
- Discounted price calculated: price \* (1 - discount_percent/100)
- Vendors update via VendorProductDiscountView endpoint
