from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
import requests

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com/search/repositories"
STATIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')


def github_search(query: str, per_page: int = 10, page: int = 1):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "repo-search-app"
    }
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": per_page,
        "page": page,
    }

    logger.info(f"GitHub search: q='{query}', per_page={per_page}, page={page}")
    r = requests.get(GITHUB_API, headers=headers, params=params, timeout=15)
    r.raise_for_status()
    data = r.json()
    items = data.get("items", [])
    total_count = data.get("total_count", 0)

    # Project only useful fields
    results = []
    for it in items:
        results.append({
            "name": it.get("name"),
            "full_name": it.get("full_name"),
            "html_url": it.get("html_url"),
            "description": it.get("description"),
            "language": it.get("language"),
            "stars": it.get("stargazers_count"),
            "owner": (it.get("owner") or {}).get("login"),
        })
    return results, total_count


@app.get("/api/search")
def search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Missing query parameter 'q'"}), 400

    per_page = request.args.get("limit", default=10, type=int)
    page = request.args.get("page", default=1, type=int)
    try:
        results, total_count = github_search(q, per_page=per_page, page=page)
        # GitHub search API caps results at 1000 even if total_count is larger
        max_window = min(total_count, 1000)
        has_next = (page * per_page) < max_window
        return jsonify({
            "query": q,
            "page": page,
            "per_page": per_page,
            "total_count": total_count,
            "count": len(results),
            "has_next": has_next,
            "results": results
        })
    except requests.HTTPError as e:
        logger.exception("GitHub API error")
        status = e.response.status_code if e.response is not None else 502
        return jsonify({"error": "GitHub API error", "status": status, "details": str(e)}), status
    except Exception as e:
        logger.exception("Unexpected server error")
        return jsonify({"error": "Server error", "details": str(e)}), 500


@app.get('/')
def root_index():
    return send_from_directory(STATIC_DIR, 'index.html')


@app.get('/<path:path>')
def static_files(path):
    return send_from_directory(STATIC_DIR, path)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
