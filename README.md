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
  - `python manage.py migrate; python manage.py collectstatic --noinput; gunicorn nativeglow_backend.wsgi:application`

### 2. Required Environment Variables

- `GOOGLE_CLIENT_ID` = your Google OAuth client ID
- `SECRET_KEY` = Django secret key for production
- `DEBUG` = `False`
- `ALLOWED_HOSTS` = your Render hostname (comma separated if multiple)

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
