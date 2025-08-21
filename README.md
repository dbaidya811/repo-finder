# Project Repo Finder

A simple web app where users type a project name and get related GitHub repositories, plus a stats dashboard showing total repos, last 24h/hour counts, per‑minute estimate, and a language-wise chart.

- Frontend: `public/index.html`, `public/style.css`, `public/script.js`
- Backend: `server/app.py` (Flask). Serves the frontend and exposes:
  - `GET /api/search?q=<query>&limit=10&page=1`
  - `GET /api/stats`

## Prerequisites
- Python 3.9+

## Setup (Windows)
1. Create and activate a virtual environment:
   ```bat
   py -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bat
   pip install -r requirements.txt
   ```
3. (Optional) Set a GitHub token to increase rate limits:
   - Create a classic token with "public_repo" scope or a fine-grained token.
   - Set env var for current session:
     ```bat
     set GITHUB_TOKEN=YOUR_TOKEN_HERE
     ```

## Run the app (single origin)
```bat
py server\app.py
```
Then open http://localhost:5000

The Flask app serves the static frontend from `public/` and the API under `/api/*`.

## API
- GET `/api/search?q=<query>&limit=<n>&page=<p>`
  - `q` (required): search text
  - `limit` (optional, default 10)
  - `page` (optional, default 1)
  - Returns: `{ query, page, per_page, total_count, count, has_next, results: [ { full_name, html_url, description, language, stars, owner } ] }`

- GET `/api/stats`
  - Query params:
    - `langs` (optional): comma-separated languages (defaults include popular languages)
  - Returns:
    ```json
    {
      "generated_at": "2025-08-21T15:10:00Z",
      "total": 123456789,
      "last_hour": 1234,
      "last_day": 45678,
      "per_minute": 20.56,
      "languages": [ { "name": "JavaScript", "count": 1234 }, ... ]
    }
    ```

## Deployment (Render example)
- Push the repo to GitHub.
- Create a new Web Service on Render.
- Environment: Python
- Build command:
  ```bash
  pip install -r requirements.txt
  ```
- Start command (pick one; add the package to requirements accordingly):
  - Using waitress (Windows-friendly): `waitress-serve --listen=0.0.0.0:$PORT server.app:app`
  - Using gunicorn: `gunicorn server.app:app --bind 0.0.0.0:$PORT`
  - (Simplest, not recommended for production): `python server/app.py`
- Environment variables:
  - `GITHUB_TOKEN` (optional, recommended)

After deploy, open your Render URL (e.g., https://your-app.onrender.com). The frontend and API share the same origin.

## Notes
- If you hit GitHub rate limits (403), set `GITHUB_TOKEN` and retry.
- You can still run a separate static server locally (e.g., `py -m http.server 8080 -d public`), but the recommended approach is using the single-origin Flask server on port 5000.
