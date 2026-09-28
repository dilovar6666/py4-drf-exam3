# Auto Anatomy

Auto Anatomy is a 3D car encyclopedia with an interactive React/Three.js viewer,
a Django REST API, user garage, product catalog, Gemini assistant and Exa web
search. PostgreSQL stores application data; Redis and Celery support background
3D import jobs. Runtime GLB files are in
`car-concept-3d-dashboard/assets/models/`. Original 3D sources stay local.

## Applications

- `accounts` — custom user and saved cars
- `cars` — cars, 3D logical components, specifications, relations, and sources
- `shop` — known spare-parts catalog, compatibility, favorites, and cart
- `ai` — AI conversations and messages

## Local setup

1. Create and activate a virtual environment.
2. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

3. Create a PostgreSQL database and set the environment variables documented
   in `.env.example`. Django reads them from the process environment. Keep real
   values in your shell or load them from a local `.env`; `.env` files are
   ignored by Git.
4. Apply and verify migrations, then start Django:

   ```powershell
   python manage.py migrate
   python manage.py check
   python manage.py runserver 127.0.0.1:8000
   ```

## Platform integrations

- The React app is in `car-concept-3d-dashboard/`. Run `npm ci`, then
  `npm run dev`. Its Vite proxy sends `/api` to Django at `127.0.0.1:8000`.
- User uploads are limited to JPEG, PNG, and WebP images (5 MB) and are stored
  under Django `MEDIA_ROOT`. 3D source uploads are staff-only and limited to
  `.blend`, `.glb`, `.gltf`, and `.fbx` (1 GB maximum).
- Local parts search works without external credentials. Exa automotive web
  search is enabled by setting `EXA_API_KEY` in the Django server environment.
- AI chat uses Google's `google-genai` SDK. Set `GEMINI_API_KEY` and optionally
  `GEMINI_MODEL` in the Django server environment. Keys are never sent to Vite.
- Background imports require Redis and the Celery extra from `requirements.txt`.
  On Windows development machines, start Redis in WSL (or another local Redis
  service), then run in separate PowerShell windows:

  ```powershell
  .\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
  .\.venv\Scripts\python.exe -m celery -A config.celery:app worker --loglevel=info --pool=solo
  cd car-concept-3d-dashboard
  npm run dev
  ```

  Set `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` if Redis is not on the
  documented local ports. Configure `BLENDER_EXECUTABLE` for the worker's
  Blender binary. The import wizard reports an unavailable queue or Blender
  runtime explicitly and keeps the original upload separate from generated
  working artifacts.

## Checks

```powershell
python manage.py makemigrations --check
python manage.py test
cd car-concept-3d-dashboard
npm test
npm run build
```
