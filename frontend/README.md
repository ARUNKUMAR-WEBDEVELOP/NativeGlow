# NativeGlow Frontend

React frontend for NativeGlow marketplace, connected to the Django API.

## Run

1. Backend:

`D:\memo\nativeglow\backend\venv\Scripts\python.exe manage.py runserver`

2. Frontend:

`npm run dev`

3. Open:

`http://127.0.0.1:5173`

## Environment

Use `.env.example` as reference:

`VITE_API_BASE=https://nativeglow.onrender.com/api`

## Deploy Frontend From GitHub

Recommended: Vercel (connect GitHub repository and deploy `frontend` as root).

1. Import repository in Vercel.
2. Set `Root Directory` to `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_BASE=https://nativeglow.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`

After frontend deployment, add your frontend URL to backend Render env:

- `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`

## GitHub Actions Deployment (GitHub Pages)

This repository includes workflow [ .github/workflows/frontend-deploy.yml ](.github/workflows/frontend-deploy.yml) that:

1. builds frontend on every push to `main`
2. deploys `frontend/dist` to GitHub Pages

Required GitHub setting:

- In repository Settings -> Pages -> Source, select `GitHub Actions`.

Optional secret for Google login on Pages:

- `VITE_GOOGLE_CLIENT_ID`

## API endpoints used by frontend

- `/api/products/categories/`
- `/api/products/featured/`
- `/api/products/best-sellers/`
- `/api/products/new-arrivals/`
- `/api/vendors/`
