# Auto Anatomy Backend

Django backend foundation for Auto Anatomy. This stage contains the project
configuration, database models, and migrations only.

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
4. Apply and verify migrations:

   ```powershell
   python manage.py migrate
   python manage.py check
   ```
