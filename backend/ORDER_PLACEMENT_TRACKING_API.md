# NativeGlow Order Placement & Tracking APIs

## Overview

3 public APIs for order placement and tracking. **NO authentication required**. Buyers place orders and track them using phone number or order code.

---

## 1. Place Order (Create)

**POST /api/order/place/**

Create a new order without login. Generates unique order code (NG-YYYY-XXXXX) for tracking.

### Request Body

```json
{
  "product_id": 42,
  "vendor_slug": "green-botanicals",
  "buyer_name": "Arjun Kumar",
  "buyer_phone": "9876543210",
  "buyer_address": "123 Green Street, Bangalore",
  "buyer_pincode": "560001",
  "quantity": 2,
  "payment_method": "upi",
  "payment_reference": "UPI123456789"
}
```

### Request Fields

| Field             | Type    | Required | Notes                          |
| ----------------- | ------- | -------- | ------------------------------ |
| product_id        | integer | Yes      | Product to order               |
| vendor_slug       | string  | No       | Verify vendor match (optional) |
| buyer_name        | string  | Yes      | Buyer full name                |
| buyer_phone       | string  | Yes      | 10-digit phone number          |
| buyer_address     | string  | Yes      | Delivery address               |
| buyer_pincode     | string  | Yes      | 6-digit pincode                |
| quantity          | integer | Yes      | >= 1, <= available_quantity    |
| payment_method    | enum    | Yes      | 'upi' or 'bank_transfer'       |
| payment_reference | string  | Yes      | UTR/Transaction ID (not blank) |

### Validations

- ✅ Phone: exactly 10 digits
- ✅ Quantity: <= available_quantity (error: "Only X items available")
- ✅ Payment Reference: not blank (error: "Please enter payment reference")
- ✅ Product: must be approved + active
- ✅ Vendor: vendor_slug must match if provided

### Success Response (201 Created)

```json
{
  "order_code": "NG-2025-00123",
  "order_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  "total_amount": "398.00",
  "payment_reference": "UPI123456789",
  "payment_method": "upi",
  "vendor_whatsapp": "919876543210",
  "message": "Order NG-2025-00123 placed successfully. Please share this code with vendor Green Botanicals."
}
```

### Response Fields

- `order_code`: Public tracking code (e.g. NG-2025-00123)
- `order_id`: Internal UUID
- `total_amount`: Subtotal (price × quantity)
- `payment_reference`: Payment UTR/ID
- `payment_method`: UPI or Bank Transfer
- `vendor_whatsapp`: Vendor contact for communication
- `message`: Confirmation message with instructions

### Error Responses

**400 Bad Request - Invalid Phone**

```json
{ "buyer_phone": ["Phone number must be 10 digits."] }
```

**400 Bad Request - Insufficient Stock**

```json
{ "quantity": ["Only 5 items available."] }
```

**400 Bad Request - Missing Payment Reference**

```json
{
  "payment_reference": ["Please enter payment reference (UTR/Transaction ID)."]
}
```

**400 Bad Request - Product Not Found/Unavailable**

```json
{ "product_id": ["Product not found or is unavailable."] }
```

**400 Bad Request - Vendor Mismatch**

```json
{ "vendor_slug": ["Vendor does not sell this product."] }
```

---

## 2. Track Orders by Phone

**GET /api/order/track/?phone=9876543210**

List all orders for a phone number (no login needed).

### Request Parameters

| Parameter | Type   | Required | Notes                 |
| --------- | ------ | -------- | --------------------- |
| phone     | string | Yes      | 10-digit phone number |

### Examples

```bash
GET /api/order/track/?phone=9876543210
GET /api/order/track/?phone=98-765-43210  # Dashes OK (auto-stripped)
```

### Success Response (200 OK)

```json
{
  "count": 3,
  "results": [
    {
      "order_code": "NG-2025-00124",
      "product_name": "Herbal Face Wash",
      "vendor_name": "Green Botanicals",
      "quantity": 2,
      "total_amount": "398.00",
      "order_status": "pending",
      "created_at": "2025-03-24T10:30:00Z"
    },
    {
      "order_code": "NG-2025-00123",
      "product_name": "Neem Soap",
      "vendor_name": "Pure Organics",
      "quantity": 1,
      "total_amount": "99.00",
      "order_status": "confirmed",
      "created_at": "2025-03-20T14:15:00Z"
    },
    ...
  ]
}
```

### Error Response (404 Not Found) - No orders for phone

```json
{
  "detail": "No orders found for phone number 9876543210.",
  "results": []
}
```

### Error Response (400 Bad Request) - Invalid phone

```json
{ "detail": "Phone number must be 10 digits." }
```

---

## 3. Track Single Order by Order Code

**GET /api/order/track/{order_code}/**

Get full order details using order code (no login needed).

### Parameters

| Parameter  | Type   | Required | Notes                                      |
| ---------- | ------ | -------- | ------------------------------------------ |
| order_code | string | Yes      | e.g., NG-2025-00123 (from step 1 response) |

### Example

```bash
GET /api/order/track/NG-2025-00123/
```

### Success Response (200 OK)

```json
{
  "order_code": "NG-2025-00123",
  "order_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  "buyer_name": "Arjun Kumar",
  "buyer_phone": "9876543210",
  "buyer_address": "123 Green Street, Bangalore",
  "buyer_pincode": "560001",
  "product_name": "Herbal Face Wash",
  "product_description": "100% natural face wash with neem and turmeric",
  "product_price": "199.00",
  "quantity": 2,
  "total_amount": "398.00",
  "payment_method": "upi",
  "payment_reference": "UPI123456789",
  "order_status": "pending",
  "vendor_name": "Green Botanicals",
  "vendor_whatsapp": "919876543210",
  "vendor_city": "Bangalore",
  "created_at": "2025-03-24T10:30:00Z",
  "updated_at": "2025-03-24T10:30:00Z"
}
```

### Response Fields

- **Order Info**: order_code, order_id, created_at, updated_at
- **Buyer Info**: buyer_name, buyer_phone, buyer_address, buyer_pincode
- **Product Info**: product_name, product_description, product_price
- **Order Details**: quantity, total_amount, payment_method, payment_reference, order_status
- **Vendor Info**: vendor_name, vendor_whatsapp (for communication), vendor_city

### Error Response (404 Not Found)

```json
{ "detail": "Order NG-2025-00999 not found." }
```

---

## Order Status Timeline

```
Pending → Confirmed → Shipped → Delivered
                    (vendor updates)
```

**Status Definitions**:

- **pending**: Order received, payment awaiting confirmation
- **confirmed**: Payment confirmed by vendor
- **shipped**: Order dispatched
- **delivered**: Order received by buyer
- **cancelled**: Order cancelled (refunded)

---

## Implementation Details

### Model Changes

- Added `order_code` field (CharField, unique, db_indexed)
- Auto-generated on order creation: Format = `NG-{year}-{5-digit-sequence}`
- Example: NG-2025-00001, NG-2025-00002

### Order Processing Flow

1. Buyer places order → Order created with status='pending'
2. Stock reduced immediately: `product.available_quantity -= qty`
3. Product marked inactive if qty becomes 0
4. order_code auto-generated (NG-2025-00123)
5. Response includes vendor WhatsApp for buyer contact

### Search Logic

- **Phone tracking**: Filters by `buyer_phone` (any format, auto-stripped to digits)
- **Order code lookup**: Unique, case-sensitive match
- **Results sorted**: By created_at descending (newest first)

### Security

- ✅ No authentication required (buyer-facing)
- ✅ Phone validation (10 digits)
- ✅ Order code is unique + public (safe to share)
- ✅ No sensitive data in responses (no payment secrets)

---

## Frontend Usage Example

```javascript
// Place order
const orderResponse = await fetch("/api/order/place/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    product_id: 42,
    vendor_slug: "green-botanicals",
    buyer_name: "Arjun Kumar",
    buyer_phone: "9876543210",
    buyer_address: "123 Green Street",
    buyer_pincode: "560001",
    quantity: 2,
    payment_method: "upi",
    payment_reference: "UPI123456789",
  }),
});
const orderData = await orderResponse.json();
const orderCode = orderData.order_code;

// Track orders by phone
const trackResponse = await fetch("/api/order/track/?phone=9876543210");
const trackData = await trackResponse.json();
console.log(trackData.count, "orders found");

// Get order detail
const detailResponse = await fetch(`/api/order/track/${orderCode}/`);
const orderDetail = await detailResponse.json();
console.log(orderDetail.order_status); // Current status
```

---

## Database Queries Optimized

- Order creation: Insert + update product quantity (2 queries)
- Phone search: Index on `buyer_phone`, select_related vendor/product
- order_code lookup: Unique index, direct hit
- No N+1 queries thanks to select_related()

---

## Notes for Vendors

- Vendors can update order status via `PATCH /api/vendor/orders/<id>/status/`
- Status transitions: pending → confirmed → shipped → delivered
- Vendor receives order notification (implement webhook if needed)
- Payment marked as 'pending' until vendor confirms
