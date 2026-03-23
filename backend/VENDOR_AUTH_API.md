# NativeGlow Vendor Authentication API

## Overview

This document describes the Django REST Framework (DRF) authentication endpoints for vendors. The implementation includes:

- **User Registration** - POST `/api/vendor/register/`
- **User Login** - POST `/api/vendor/login/`
- **Profile Retrieval** - GET `/api/vendor/me/`

## Installation & Setup

### Requirements
- Django 6.0+
- djangorestframework 3.14+
- djangorestframework-simplejwt 5.5+
- psycopg2-binary (PostgreSQL adapter)

All dependencies are already in `requirements.txt`.

### Configuration

The JWT authentication is configured in `settings.py` using `djangorestframework-simplejwt`. Ensure the following settings are present:

```python
# settings.py

INSTALLED_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    # ... other apps
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

## API Endpoints

### 1. Vendor Registration

**Endpoint:** `POST /api/vendor/register/`

**Authentication:** Not required (public endpoint)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "full_name": "John Doe",
    "email": "vendor@example.com",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!",
    "business_name": "Organic Farms Co.",
    "whatsapp_number": "+919876543210",
    "city": "Mumbai",
    "upi_id": "john@upi",
    "bank_account_number": "1234567890123456",
    "bank_ifsc": "SBIN0001234",
    "account_holder_name": "John Doe"
}
```

**Request Validation:**
- `full_name`: Required, max 255 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 8 characters
- `confirm_password`: Required, must match password
- `business_name`: Required, max 255 characters
- `whatsapp_number`: Required (for communication)
- `city`: Required
- `upi_id`: Optional
- `bank_account_number`: Optional
- `bank_ifsc`: Optional, max 20 characters
- `account_holder_name`: Optional

**Response (201 - Created):**
```json
{
    "id": 1,
    "full_name": "John Doe",
    "email": "vendor@example.com",
    "business_name": "Organic Farms Co.",
    "vendor_slug": "organic-farms-co",
    "city": "Mumbai",
    "is_approved": false,
    "message": "Registration successful! Your account is pending admin approval. You will receive an email once approved."
}
```

**Response (400 - Bad Request):**
```json
{
    "email": ["A vendor with this email already exists."],
    "confirm_password": ["Passwords do not match."]
}
```

**Notes:**
- Passwords are hashed using Django's `make_password()` function
- `vendor_slug` is auto-generated from `business_name` using `slugify()`
- `is_approved` defaults to `False` - vendors need admin approval to login
- Cannot register if email already exists in the system
- Password must be at least 8 characters

---

### 2. Vendor Login

**Endpoint:** `POST /api/vendor/login/`

**Authentication:** Not required (public endpoint)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "email": "vendor@example.com",
    "password": "SecurePass123!"
}
```

**Response (200 - OK):**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjQ1MTIzNDU2LCJpYXQiOjE2NDUxMjM1NjIsImp0aSI6IjU5YzE2OTk1YTg3MjRjNjZhNDEyODliYjE4MGQwZWU5IiwidXNlcl9pZCI6MSwiZW1haWwiOiJ2ZW5kb3JAZXhhbXBsZS5jb20iLCJpc192ZW5kb3IiOnRydWV9.2eKs_oN3iWL4dT1Q2Hq3_v4x5y6z7a8b9c0d1e2f3",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTY0NTEyMzU2MiwiaWF0IjoxNjQ1MTIzNTYyLCJqdGkiOiI1OWMxNjk5NWE4NzI0YzY2YTQxMjg5YmIxODBkMGVlOSIsInVzZXJfaWQiOjEsImVtYWlsIjoidmVuZG9yQGV4YW1wbGUuY29tIiwiaXNfdmVuZG9yIjp0cnVlfQ.3eKs_pO4jWL5eU2R3Ir4_w5y7z8a9c0d1e2f3g4h5",
    "vendor": {
        "id": 1,
        "full_name": "John Doe",
        "email": "vendor@example.com",
        "business_name": "Organic Farms Co.",
        "vendor_slug": "organic-farms-co",
        "city": "Mumbai",
        "is_approved": true
    }
}
```

**Response (400 - Bad Request):**
```json
{
    "non_field_errors": ["Invalid email or password."]
}
```

**Response (403 - Forbidden):**
```json
{
    "non_field_errors": ["Your account is pending admin approval. You will be notified by email once approved."]
}
```

**Validation Rules:**
1. Email and password must be validated against the database
2. `is_approved` must be `True` for vendor to login
3. `is_active` must be `True` (account not deactivated)
4. Password is verified using Django's `check_password()` function

**Token Information:**
- `access`: JWT access token (1 hour lifetime by default)
- `refresh`: JWT refresh token (7 days lifetime by default)
- Access token contains: `vendor_id`, `email`, `is_vendor` claims
- Use access token in Authorization header for protected endpoints

---

### 3. Get Vendor Profile

**Endpoint:** `GET /api/vendor/me/`

**Authentication:** Required (JWT Bearer token)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response (200 - OK):**
```json
{
    "id": 1,
    "full_name": "John Doe",
    "email": "vendor@example.com",
    "business_name": "Organic Farms Co.",
    "vendor_slug": "organic-farms-co",
    "city": "Mumbai",
    "whatsapp_number": "+919876543210",
    "upi_id": "john@upi",
    "bank_account_number": "1234567890123456",
    "bank_ifsc": "SBIN0001234",
    "account_holder_name": "John Doe",
    "is_approved": true,
    "is_active": true,
    "maintenance_due": false,
    "maintenance_due_status": "No outstanding maintenance fee",
    "created_at": "2026-03-23T10:30:00Z",
    "updated_at": "2026-03-23T10:30:00Z"
}
```

**Response (401 - Unauthorized):**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**Response (403 - Forbidden):**
```json
{
    "detail": "You do not have permission to perform this action."
}
```

**Notes:**
- All fields are read-only in this view
- `maintenance_due_status` provides human-readable status
- Requires valid JWT access token in Authorization header

---

## Usage Examples

### Example 1: Register a New Vendor (cURL)

```bash
curl -X POST http://localhost:8000/api/vendor/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Alice Smith",
    "email": "alice@naturalproducts.com",
    "password": "AliceSecure123!",
    "confirm_password": "AliceSecure123!",
    "business_name": "Nature's Best",
    "whatsapp_number": "+919123456789",
    "city": "Bangalore",
    "upi_id": "alice@okhdfcbank",
    "bank_account_number": "9876543210",
    "bank_ifsc": "HDFC0000123",
    "account_holder_name": "Alice Smith"
  }'
```

### Example 2: Login and Get Tokens (cURL)

```bash
curl -X POST http://localhost:8000/api/vendor/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@naturalproducts.com",
    "password": "AliceSecure123!"
  }'
```

### Example 3: Access Protected Profile Endpoint (cURL)

```bash
curl -X GET http://localhost:8000/api/vendor/me/ \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json"
```

### Example 4: Using Python Requests

```python
import requests

# Register
response = requests.post(
    'http://localhost:8000/api/vendor/register/',
    json={
        'full_name': 'Bob Wilson',
        'email': 'bob@organicfarms.com',
        'password': 'BobSecure123!',
        'confirm_password': 'BobSecure123!',
        'business_name': 'Organic Farms',
        'whatsapp_number': '+919987654321',
        'city': 'Delhi',
        'upi_id': 'bob@upi'
    }
)
print(response.json())

# Login
login_response = requests.post(
    'http://localhost:8000/api/vendor/login/',
    json={
        'email': 'bob@organicfarms.com',
        'password': 'BobSecure123!'
    }
)
tokens = login_response.json()
access_token = tokens['access']

# Get profile
profile_response = requests.get(
    'http://localhost:8000/api/vendor/me/',
    headers={'Authorization': f'Bearer {access_token}'}
)
print(profile_response.json())
```

### Example 5: Using JavaScript/Fetch

```javascript
// Register
const registerResponse = await fetch('http://localhost:8000/api/vendor/register/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Eve Johnson',
    email: 'eve@naturalfoods.com',
    password: 'EveSecure123!',
    confirm_password: 'EveSecure123!',
    business_name: 'Natural Foods Co.',
    whatsapp_number: '+919456789123',
    city: 'Hyderabad',
    upi_id: 'eve@upi'
  })
});
const registerData = await registerResponse.json();
console.log(registerData);

// Login
const loginResponse = await fetch('http://localhost:8000/api/vendor/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'eve@naturalfoods.com',
    password: 'EveSecure123!'
  })
});
const loginData = await loginResponse.json();
const accessToken = loginData.access;

// Get profile
const profileResponse = await fetch('http://localhost:8000/api/vendor/me/', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const profileData = await profileResponse.json();
console.log(profileData);
```

---

## Error Handling

### Common Errors

**1. Invalid Email Format (400)**
```json
{
    "email": ["Enter a valid email address."]
}
```

**2. Password Too Short (400)**
```json
{
    "password": ["Ensure this field has at least 8 characters."]
}
```

**3. Duplicate Email (400)**
```json
{
    "email": ["A vendor with this email already exists."]
}
```

**4. Account Not Approved (403)**
```json
{
    "non_field_errors": ["Your account is pending admin approval. You will be notified by email once approved."]
}
```

**5. Invalid Credentials (400)**
```json
{
    "non_field_errors": ["Invalid email or password."]
}
```

**6. Missing Authorization Header (401)**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**7. Invalid/Expired Token (401)**
```json
{
    "detail": "Token is invalid or expired"
}
```

---

## Token Refresh

To refresh an expired access token, use the refresh token:

**Endpoint:** `POST /api/token/refresh/`

**Request:**
```json
{
    "refresh": "<refresh_token>"
}
```

**Response:**
```json
{
    "access": "<new_access_token>"
}
```

This endpoint is provided by `djangorestframework-simplejwt`.

---

## Security Best Practices

1. **Password Storage**: Passwords are hashed using Django's PBKDF2 algorithm with SHA256
2. **Token Security**: 
   - Store tokens securely (e.g., HttpOnly cookies for web apps)
   - Use HTTPS only in production
   - Implement token rotation
   - Set appropriate token lifetimes
3. **Field Validation**:
   - Email is validated for format and uniqueness
   - Password minimum length enforced (8 chars)
   - Business name length restricted
4. **Access Control**:
   - Only approved vendors can login
   - Deactivated accounts are blocked
   - JWT tokens must be provided for protected endpoints

---

## Implementation Details

### Serializers

#### VendorRegisterSerializer
- Validates password and confirm_password match
- Checks email uniqueness
- Auto-hashes password on create
- Auto-generates vendor_slug from business_name

#### VendorLoginSerializer
- Validates email exists
- Checks password against hashed value
- Verifies is_approved status
- Checks is_active status

#### VendorProfileSerializer
- Read-only fields for security
- Includes computed field for maintenance_due_status
- Shows all relevant vendor information

### Views

#### VendorRegisterView (CreateAPIView)
- Accepts POST requests
- Creates new Vendor instance
- Returns custom response with vendor details and success message
- Public endpoint (no authentication required)

#### VendorLoginView (APIView)
- Accepts POST requests
- Generates JWT access and refresh tokens
- Returns vendor profile summary
- Public endpoint

#### VendorProfileView (RetrieveUpdateAPIView)
- Accepts GET requests
- Requires JWT authentication
- Returns full vendor profile
- Protected endpoint

---

## File Structure

```
vendors/
├── models.py                 # Vendor model
├── serializers.py            # DRF serializers (auth + existing)
├── views.py                  # DRF views (auth + existing)
├── urls.py                   # URL routing
├── admin.py
└── ...
```

---

## Integration with Frontend

When integrating with a frontend application:

1. Call **Register endpoint** to create vendor account
2. Show message: "Account pending admin approval"
3. Store **access token** after login in secure storage
4. Use **access token** for all authenticated requests
5. Implement token refresh when access token expires
6. Call **Profile endpoint** to display vendor dashboard

---

## Testing with Postman/cURL

See examples section above for ready-to-use requests.

---

**Last Updated:** March 23, 2026
**API Version:** 1.0
