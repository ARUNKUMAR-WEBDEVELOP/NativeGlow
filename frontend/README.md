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

`VITE_API_BASE=http://127.0.0.1:8000/api`

## API endpoints used by frontend

- `/api/products/categories/`
- `/api/products/featured/`
- `/api/products/best-sellers/`
- `/api/products/new-arrivals/`
- `/api/vendors/`
