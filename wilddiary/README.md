# Wild Diary

Wild Diary is a React/Vite community diary backed by a Flask REST API and SQLite.

## Local development

From the repository root, prepare and run the API:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe app.py
```

Set a unique `JWT_SECRET` in `backend/.env`. In a second terminal, run the frontend:

Production deployments intentionally refuse to start without `JWT_SECRET`. Configure it
in the hosting provider's secret/environment-variable settings and keep the same value
for every worker and replica. Do not generate a different value during each process start.

To enable provider-backed Harbor chat, also set `OPENAI_API_KEY`. `OPENAI_MODEL` controls
the server-side model. Without a key, Harbor uses its built-in local supportive-response
mode; crisis detection remains active in both modes. Never place the API key in Vite or
browser environment variables.

```powershell
cd wilddiary
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:5000`. For a separately hosted API, set
`VITE_API_URL` in `wilddiary/.env.local`.

For production, configure `VITE_API_URL` in the frontend hosting provider to the active
backend URL ending in `/api`. Verify that URL's `/health` endpoint before deploying the
frontend; do not commit a temporary or expired deployment hostname.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

cd ..\wilddiary
npm run lint
npm run build
```

Accounts always begin as community members. Counselor verification is an administrative
operation and is intentionally not exposed through the public API.
