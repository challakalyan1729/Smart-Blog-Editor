# Smart Blog Editor

Production-ready full stack blog editor built for the "Notion-style editor + robust state management" assignment.

## Tech Stack
- Frontend: React + Tailwind CSS + Zustand + Lexical
- Backend: FastAPI (Python)
- Database: SQLite

## Features Implemented
- Rich text editor with Lexical (bold, italic, headings, ordered list, unordered list, history undo/redo).
- Global state management with Zustand:
  - current editor state
  - draft list
  - selected post
  - save/publish/AI status
- REST APIs for draft creation, update, listing, fetch-by-id, and publish.
- Intelligent auto-save:
  - custom debounce + queue flow
  - avoids API call on every keystroke
  - handles edits made while a save request is still in flight
- AI integration:
  - `Generate Summary`
  - `Fix Grammar`
  - streamed response from backend into UI.

## API Endpoints
- `POST /api/posts/` create draft
- `PATCH /api/posts/{id}` update draft content
- `POST /api/posts/{id}/publish` publish draft
- `GET /api/posts/` list all drafts/posts
- `GET /api/posts/{id}` fetch one post
- `POST /api/ai/generate` stream AI summary/grammar response

## Setup Instructions

### 1. Frontend
```bash
npm install
npm run dev
```
Runs on: `http://127.0.0.1:5173`

### 2. Backend
Create and activate virtual environment, then install backend deps:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.backend.main:app --reload --port 8000
```
Runs on: `http://127.0.0.1:8000`

## Auto-Save Logic (Debounce + Queue)
Implemented in `src/hooks/undebounceSave.js`:
- Every editor change updates Zustand (`changeToken` increments).
- Debounce waits `1200ms` after last keystroke before queueing a save.
- Queue keeps latest snapshot while one request is in flight.
- If user keeps typing during a save, newest snapshot is saved immediately after the current request finishes.

Result: minimal API spam, ordered updates, and no lost edits during async saves.

## Database Schema Choice
Table: `posts`
- `content_json`: stores Lexical JSON document state directly (lossless rehydration).
- `content_text`: plain text used for quick previews and AI input.
- `status`: `draft` or `published`.
- `title`: inferred from content for list UX.
- `created_at`, `updated_at`: auditing and sorting.

Reasoning: storing Lexical JSON preserves editor fidelity; text column supports lightweight querying and previews.

## Architecture Documentation
- `ARCHITECTURE.md` (includes system diagram and file-level design).

## Demo Deliverables
- Demo video link: add your Loom/YouTube URL here.
- Deployed link: add your deployment URL here (e.g. Vercel + Render/Railway).
