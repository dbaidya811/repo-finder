const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = (isLocalHost && window.location.port && window.location.port !== '5000')
  ? 'http://localhost:5000'
  : '';

const form = document.getElementById('search-form');
const input = document.getElementById('query');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const button = document.getElementById('search-btn');

// Suggestions section
const suggestions = document.getElementById('suggestions');
const sugGrid = suggestions ? suggestions.querySelector('.grid') : null;
const SUGGESTION_COUNT = 5; // first 5 are random; 6th is reserved for user card
const suggestionsPool = [
  { name: 'freeCodeCamp/freeCodeCamp', desc: 'Open-source codebase and curriculum', url: 'https://github.com/freeCodeCamp/freeCodeCamp' },
  { name: 'public-apis/public-apis', desc: 'Collective list of free APIs', url: 'https://github.com/public-apis/public-apis' },
  { name: 'awesomeWM/awesome', desc: 'Highly configurable window manager', url: 'https://github.com/awesomeWM/awesome' },
  { name: 'vercel/next.js', desc: 'React framework by Vercel', url: 'https://github.com/vercel/next.js' },
  { name: 'facebook/react', desc: 'The library for web and native UIs', url: 'https://github.com/facebook/react' },
  { name: 'vuejs/vue', desc: 'The Progressive JavaScript Framework', url: 'https://github.com/vuejs/vue' },
  { name: 'twbs/bootstrap', desc: 'The most popular HTML, CSS, and JS library', url: 'https://github.com/twbs/bootstrap' },
  { name: 'nodejs/node', desc: 'Node.js JavaScript runtime', url: 'https://github.com/nodejs/node' },
  { name: 'denoland/deno', desc: 'A modern runtime for JavaScript and TypeScript', url: 'https://github.com/denoland/deno' },
  { name: 'microsoft/vscode', desc: 'Visual Studio Code', url: 'https://github.com/microsoft/vscode' },
  { name: 'django/django', desc: 'The Web framework for perfectionists with deadlines', url: 'https://github.com/django/django' },
  { name: 'torvalds/linux', desc: 'Linux kernel source tree', url: 'https://github.com/torvalds/linux' },
];

function pickRandom(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function buildUserReposCard(username) {
  // Container markup with loading state
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="suggestion-card" id="user-repos-card">
      <strong>${username}'s repositories</strong>
      <div class="repo-list loading"><span class="spinner" aria-hidden="true"></span> Loading…</div>
      <a class="view-profile" href="https://github.com/${username}" target="_blank" rel="noopener noreferrer">View profile →</a>
    </div>
  `;
  const card = wrapper.firstElementChild;

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`);
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) throw new Error('No repos');
    const one = repos[Math.floor(Math.random() * repos.length)];
    const list = document.createElement('ul');
    list.className = 'repo-list single';
    list.innerHTML = `
      <li>
        <div class="repo-meta">
          <a href="${one.html_url}" target="_blank" rel="noopener noreferrer">${one.name}</a>
          <span class="lang">${one.language ?? ''}</span>
        </div>
        ${one.description ? `<div class="desc">${one.description}</div>` : ''}
      </li>
    `;
    const old = card.querySelector('.repo-list');
    old.replaceWith(list);
  } catch (e) {
    const old = card.querySelector('.repo-list');
    const errBox = document.createElement('div');
    errBox.className = 'repo-list error';
    errBox.textContent = 'Could not load repos.';
    old.replaceWith(errBox);
  }

  return card;
}

async function renderSuggestions() {
  if (!sugGrid) return;
  const chosen = pickRandom(suggestionsPool, SUGGESTION_COUNT);
  // Render first 5 static cards
  sugGrid.innerHTML = chosen.map(s => `
    <a class="suggestion-card" href="${s.url}" target="_blank" rel="noopener noreferrer">
      <strong>${s.name}</strong>
      <span>${s.desc}</span>
    </a>
  `).join('');
  // Append the 6th card: user repos (single random repo per reload)
  const userCard = await buildUserReposCard('dbaidya811');
  sugGrid.appendChild(userCard);
}

function showSuggestions(show) {
  if (!suggestions) return;
  suggestions.hidden = !show;
  if (show) renderSuggestions();
}

// Pagination elements
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

let currentQuery = '';
let currentPage = 1;
let hasNext = false;
const perPage = 10;

function renderResults(items) {
  resultsEl.innerHTML = '';
  if (!items || items.length === 0) {
    resultsEl.innerHTML = '<li class="result-item">No results found.</li>';
    return;
  }
  for (const r of items) {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      <a class="title" href="${r.html_url}" target="_blank" rel="noopener noreferrer">${r.full_name}</a>
      <div class="meta">⭐ ${r.stars ?? 0} • ${r.language ?? 'NA'} • by ${r.owner ?? 'unknown'}</div>
      <div class="desc">${r.description ? r.description : ''}</div>
    `;
    resultsEl.appendChild(li);
  }
}

function updatePaginationUI() {
  if (!pagination) return;
  pagination.hidden = !currentQuery; // show only after a search
  if (pageInfo) pageInfo.textContent = `Page ${currentPage}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = !hasNext;
}

async function search(q, page = 1) {
  showSuggestions(false);
  statusEl.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Searching…</span>';
  button.disabled = true;
  resultsEl.innerHTML = '';
  try {
    const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=${perPage}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed with ${res.status}`);
    }
    const data = await res.json();
    currentQuery = data.query || q;
    currentPage = data.page || page;
    hasNext = !!data.has_next;
    statusEl.textContent = `Found ${data.total_count ?? data.count} results`;
    renderResults(data.results);
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
  } finally {
    updatePaginationUI();
    button.disabled = false;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  search(q, 1);
});

// When input is cleared, restore suggestions and reset list/pagination
input.addEventListener('input', () => {
  const q = input.value.trim();
  if (q === '') {
    currentQuery = '';
    currentPage = 1;
    hasNext = false;
    resultsEl.innerHTML = '';
    statusEl.textContent = '';
    if (pagination) pagination.hidden = true;
    showSuggestions(true);
  }
});

if (prevBtn) prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    search(currentQuery, currentPage - 1);
  }
});

if (nextBtn) nextBtn.addEventListener('click', () => {
  if (hasNext) {
    search(currentQuery, currentPage + 1);
  }
});

// Initial suggestions visibility
showSuggestions(!input.value.trim());
