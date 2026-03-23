# Admin Authentication API Documentation

## Overview
Admin endpoints use JWT-based authentication with custom role verification. All admin requests must include a valid admin JWT token with `role="admin"` in the payload.

## Endpoints

### 1. Admin Login
**POST** `/api/admin/login/`

Login with admin credentials to receive JWT tokens.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "admin": {
    "id": 1,
    "full_name": "Admin User",
    "email": "admin@example.com",
    "is_superadmin": true
  }
}
```

**Error Examples:**
- 400: `{"detail": "Invalid email or password."}`
- 400: `{"detail": "Email and password are required."}`

---

### 2. Admin Profile
**GET** `/api/admin/me/`

Retrieve authenticated admin's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "full_name": "Admin User",
  "email": "admin@example.com",
  "is_superadmin": true,
  "created_at": "2026-03-23T10:30:00Z"
}
```

**Error Examples:**
- 401: `{"detail": "Authentication credentials were not provided."}`
- 401: `{"detail": "Token is not an admin token."}`
- 401: `{"detail": "Token is invalid or expired"}`

---

## Authentication Flow

### Token Structure
Admin JWT tokens include custom claims:
```python
{
  "token_type": "access",
  "exp": 1711300200,
  "iat": 1711213800,
  "jti": "...",
  "admin_id": 1,
  "email": "admin@example.com",
  "role": "admin",          # ← Must be "admin"
  "is_superadmin": true
}
```

### Custom Authentication Class
The `AdminJWTAuthentication` class:
1. Validates JWT signature and expiry
2. Verifies `role == "admin"` claim
3. Fetches `AdminUser` by `admin_id` from token
4. Attaches admin user to `request.admin_user`

If any checks fail, returns **401 Unauthorized**.

---

## Implementation Details

### Models
- **AdminUser**: Custom model (not using Django auth.User)
  - Fields: full_name, email, password, is_superadmin, created_at
  - Methods: check_password(), save() with auto-hashing

### Serializers
- **AdminLoginSerializer**: Validates email/password, returns AdminUser instance
- **AdminProfileSerializer**: Serializes AdminUser to JSON response

### Authentication
- **AdminJWTAuthentication**: Extends DRF's JWTAuthentication
  - Checks Authorization header
  - Validates role="admin" claim
  - Fetches and attaches AdminUser to request

### Views
- **AdminLoginView**: POST endpoint, returns access + refresh tokens
- **AdminProfileView**: GET endpoint, requires AdminJWTAuthentication

---

## Usage Example (Frontend)

```javascript
// Step 1: Login
const response = await fetch('/api/admin/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'securepass123'
  })
});

const { access, refresh, admin } = await response.json();

// Store tokens
localStorage.setItem('nativeglow_admin_tokens', JSON.stringify({
  access,
  refresh,
  email: admin.email,
}));

// Step 2: Fetch admin profile
const meResponse = await fetch('/api/admin/me/', {
  headers: {
    'Authorization': `Bearer ${access}`
  }
});

const adminProfile = await meResponse.json();
console.log(adminProfile); // { id, full_name, email, is_superadmin, created_at }
```

---

## Security Notes

1. **Token Expiry**: Access tokens expire after 1 day; refresh tokens after 7 days.
2. **Role Verification**: Only tokens with `role="admin"` are accepted.
3. **Password Hashing**: Uses Django's PBKDF2 hashing (compatible with check_password).
4. **Superadmin Gating**: AdminUserCreationForm in Django admin requires superadmin credentials to create new admins.
5. **Authorization Header**: Token must be in format `Bearer <token>` (standard JWT format).

---

## Future Enhancements

These endpoints are ready for additional admin APIs:
- `PUT /api/admin/me/` — Update admin profile
- `POST /api/admin/logout/` — Blacklist refresh token
- `GET /api/admin/vendors/` — List vendors (admin approval workflow)
- `PATCH /api/admin/vendors/<id>/approve/` — Approve vendor
- `GET /api/admin/products/` — Review pending products
- `PATCH /api/admin/products/<id>/approve/` — Approve/reject product

All would use `AdminJWTAuthentication` permission class.

