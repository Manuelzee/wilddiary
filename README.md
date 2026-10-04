# Wild Diary

Wild Diary is a React/Vite community diary backed by a Flask REST API. It uses
SQLite for local development and PostgreSQL for persistent production storage.
Harbor, its private support chat, runs on a built-in counseling engine and does
not require an external AI service or API key.

## Local development

Create a Python environment and start the API from `backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Then start the frontend from `wilddiary`:

```powershell
npm install
npm run dev
```

Without `DATABASE_URL`, the API stores data in `backend/wilddiary.db` (or the
path in `DATABASE_PATH`). For production, set `DATABASE_URL` to a PostgreSQL
connection string and set a random `JWT_SECRET` of at least 32 characters.

Users always register as community members. Counselor verification is an
administrative operation and is intentionally not exposed through the public API.

## First administrator

Register the administrator's account normally, then promote it from a trusted
backend shell (the command asks you to type the email again):

```powershell
cd backend
.\.venv\Scripts\python.exe manage_admin.py admin@example.com
```

After signing in again, the account will have an **Admin dashboard** entry in
the profile menu. Public requests cannot assign the administrator role.
