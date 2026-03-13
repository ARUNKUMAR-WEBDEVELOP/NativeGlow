# NativeGlow

NativeGlow is a full-stack marketplace for premium natural skincare and comfort clothing.

## Repository Structure

- `backend/` Django REST API (auth, products, vendors, orders)
- `frontend/` React + Vite storefront

## Backend Deployment (Render)

Use the `backend/` folder as your Render service root.

### 1. Render Service Settings

- Environment: `Python`
- Root Directory: `backend`
- Build Command:
  - `pip install -r requirements.txt`
- Start Command:
  - `python manage.py migrate; python manage.py collectstatic --noinput; gunicorn nativeglow_backend.wsgi:application --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-2}`

### 2. Required Environment Variables

- `GOOGLE_CLIENT_ID` = your Google OAuth client ID
- `SECRET_KEY` = Django secret key for production
- `DEBUG` = `False`
- `ALLOWED_HOSTS` = your Render hostname (comma separated if multiple)
- `CORS_ALLOWED_ORIGINS` = frontend origins if you want strict CORS control

## Frontend Deployment (Render Static Site)

Use the `frontend/` folder as your Render static service root.

### 1. Render Service Settings

- Environment: `Static Site`
- Root Directory: `frontend`
- Build Command:
  - `npm install && npm run build`
- Publish Directory:
  - `dist`

### 2. Required Frontend Environment Variables

- `VITE_API_BASE=https://nativeglow.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID=<your_google_client_id>`

The frontend now defaults to `https://nativeglow.onrender.com/api` in `api.js`, but setting `VITE_API_BASE` in Render is still recommended.

### 3. Optional but Recommended

- Configure SMTP credentials for OTP emails.
- Use PostgreSQL in Render for production instead of SQLite.

## Local Development

### Backend

1. `cd backend`
2. `venv\\Scripts\\activate` (Windows)
3. `pip install -r requirements.txt`
4. `python manage.py migrate`
5. `python manage.py runserver`

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Notes

- Local env files (`.env`) are ignored by Git for privacy.
- Only `.env.example` files are tracked in the repository.
