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

## Vercel Auto Deployment

After you connect this repository to Vercel, deployments happen automatically.

1. Push changes to `main`.
2. Vercel auto-builds and deploys from `frontend`.
3. Use Vercel Deployments tab for logs/rollback.

Recommended project settings in Vercel:

- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variables in Vercel:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE`
- `VITE_GOOGLE_AUTH_ORIGIN` if you want the app to warn on a non-authorized hostname before Google sign-in starts

Google Cloud Console must include the exact deployed frontend origin in Authorized JavaScript origins. For the current deployment that means the same host you open in the browser, such as https://native-glow.vercel.app.

## API endpoints used by frontend

- `/api/products/categories/`
- `/api/products/featured/`
- `/api/products/best-sellers/`
- `/api/products/new-arrivals/`
- `/api/vendors/`
