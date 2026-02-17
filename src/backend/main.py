from __future__ import annotations

import asyncio
import copy
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "blog.db"

DEFAULT_EDITOR_STATE = {
    "root": {
        "children": [
            {
                "children": [],
                "direction": None,
                "format": "",
                "indent": 0,
                "type": "paragraph",
                "version": 1,
            }
        ],
        "direction": None,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
    }
}

app = FastAPI(title="Smart Blog Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def db_conn() -> Generator[sqlite3.Connection, None, None]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def infer_title(text: str) -> str:
    clean = re.sub(r"\s+", " ", (text or "")).strip()
    if not clean:
        return "Untitled draft"
    return clean[:70]


def default_editor_state() -> dict[str, Any]:
    return copy.deepcopy(DEFAULT_EDITOR_STATE)


def is_valid_editor_state(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    root = data.get("root")
    if not isinstance(root, dict):
        return False
    if root.get("type") != "root":
        return False
    if not isinstance(root.get("children"), list):
        return False
    return True


def normalize_editor_state(raw: Any) -> dict[str, Any]:
    parsed: Any
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return default_editor_state()
    else:
        parsed = raw

    if not is_valid_editor_state(parsed):
        return default_editor_state()

    normalized = copy.deepcopy(parsed)
    root = normalized["root"]
    root.setdefault("direction", None)
    root.setdefault("format", "")
    root.setdefault("indent", 0)
    root.setdefault("version", 1)
    if not root["children"]:
        root["children"] = copy.deepcopy(DEFAULT_EDITOR_STATE["root"]["children"])
    return normalized


def ensure_schema() -> None:
    with db_conn() as connection:
        cursor = connection.cursor()
        default_state_json = json.dumps(DEFAULT_EDITOR_STATE)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'Untitled draft',
                content_json TEXT NOT NULL,
                content_text TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'draft',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute("PRAGMA table_info(posts)")
        columns = {row["name"] for row in cursor.fetchall()}

        if "content" in columns and "content_json" not in columns:
            cursor.execute("ALTER TABLE posts ADD COLUMN content_json TEXT")
            cursor.execute("UPDATE posts SET content_json = content WHERE content_json IS NULL")

        if "content_text" not in columns:
            cursor.execute("ALTER TABLE posts ADD COLUMN content_text TEXT NOT NULL DEFAULT ''")

        if "title" not in columns:
            cursor.execute("ALTER TABLE posts ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled draft'")

        cursor.execute(
            "UPDATE posts SET title = COALESCE(NULLIF(title, ''), 'Untitled draft')"
        )
        cursor.execute(
            "UPDATE posts SET content_json = COALESCE(NULLIF(content_json, ''), ?)",
            (default_state_json,),
        )

        cursor.execute("SELECT id, content_json FROM posts")
        for row in cursor.fetchall():
            normalized = normalize_editor_state(row["content_json"])
            current_raw = row["content_json"] or ""
            normalized_raw = json.dumps(normalized)
            if current_raw != normalized_raw:
                cursor.execute(
                    "UPDATE posts SET content_json = ? WHERE id = ?",
                    (normalized_raw, row["id"]),
                )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC)")
        connection.commit()


def row_to_post(row: sqlite3.Row) -> dict[str, Any]:
    content_json = normalize_editor_state(row["content_json"])

    return {
        "id": row["id"],
        "title": row["title"],
        "content_json": content_json,
        "content_text": row["content_text"] or "",
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def fallback_summary(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return "Write some content first, then generate a summary."

    sentences = [chunk.strip() for chunk in re.split(r"(?<=[.!?])\s+", cleaned) if chunk.strip()]
    lead = sentences[:2] if sentences else [cleaned[:240]]
    word_count = len(cleaned.split())
    return f"{' '.join(lead)}\n\nSummary Stats: {word_count} words."


def fallback_grammar_fix(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return "Nothing to fix yet. Add some text first."

    normalized = cleaned[0].upper() + cleaned[1:] if len(cleaned) > 1 else cleaned.upper()
    if normalized[-1] not in ".!?":
        normalized += "."
    normalized = normalized.replace(" i ", " I ")
    return normalized


def try_gemini(mode: Literal["summary", "grammar"], text: str) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import google.generativeai as genai
    except Exception:
        return None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        if mode == "grammar":
            prompt = (
                "Fix grammar and punctuation while preserving meaning. "
                "Return only the corrected text.\n\n"
                f"{text}"
            )
        else:
            prompt = (
                "Summarize this blog content in 3-4 concise sentences. "
                "Return plain text only.\n\n"
                f"{text}"
            )

        response = model.generate_content(prompt)
        if response and getattr(response, "text", None):
            return response.text.strip()
    except Exception:
        return None

    return None


async def stream_chunks(payload: str):
    for index in range(0, len(payload), 30):
        chunk = payload[index : index + 30]
        message = json.dumps({"chunk": chunk})
        yield f"data: {message}\n\n"
        await asyncio.sleep(0.03)
    yield "data: [DONE]\n\n"


class PostPayload(BaseModel):
    title: str | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    content_text: str = ""


class AIRequest(BaseModel):
    text: str
    mode: Literal["summary", "grammar"] = "summary"


ensure_schema()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/posts/")
def list_posts() -> dict[str, list[dict[str, Any]]]:
    with db_conn() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT id, title, content_json, content_text, status, created_at, updated_at
            FROM posts
            ORDER BY updated_at DESC
            """
        )
        rows = cursor.fetchall()
    return {"posts": [row_to_post(row) for row in rows]}


@app.get("/api/posts/{post_id}")
def get_post(post_id: int) -> dict[str, Any]:
    with db_conn() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT id, title, content_json, content_text, status, created_at, updated_at
            FROM posts
            WHERE id = ?
            """,
            (post_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
    return row_to_post(row)


@app.post("/api/posts/")
def create_post(payload: PostPayload) -> dict[str, Any]:
    timestamp = now_iso()
    title = payload.title or infer_title(payload.content_text)
    content_json = json.dumps(normalize_editor_state(payload.content_json))
    content_text = payload.content_text or ""

    with db_conn() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO posts (title, content_json, content_text, status, created_at, updated_at)
            VALUES (?, ?, ?, 'draft', ?, ?)
            """,
            (title, content_json, content_text, timestamp, timestamp),
        )
        post_id = cursor.lastrowid
        connection.commit()

        cursor.execute(
            """
            SELECT id, title, content_json, content_text, status, created_at, updated_at
            FROM posts
            WHERE id = ?
            """,
            (post_id,),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Post creation failed")
    return row_to_post(row)


@app.patch("/api/posts/{post_id}")
def update_post(post_id: int, payload: PostPayload) -> dict[str, Any]:
    timestamp = now_iso()
    title = payload.title or infer_title(payload.content_text)
    content_json = json.dumps(normalize_editor_state(payload.content_json))
    content_text = payload.content_text or ""

    with db_conn() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM posts WHERE id = ?", (post_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")

        cursor.execute(
            """
            UPDATE posts
            SET title = ?, content_json = ?, content_text = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, content_json, content_text, timestamp, post_id),
        )
        connection.commit()

        cursor.execute(
            """
            SELECT id, title, content_json, content_text, status, created_at, updated_at
            FROM posts
            WHERE id = ?
            """,
            (post_id,),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Post update failed")
    return row_to_post(row)


@app.post("/api/posts/{post_id}/publish")
def publish_post(post_id: int) -> dict[str, Any]:
    timestamp = now_iso()
    with db_conn() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM posts WHERE id = ?", (post_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")

        cursor.execute(
            "UPDATE posts SET status = 'published', updated_at = ? WHERE id = ?",
            (timestamp, post_id),
        )
        connection.commit()
        cursor.execute(
            """
            SELECT id, title, content_json, content_text, status, created_at, updated_at
            FROM posts
            WHERE id = ?
            """,
            (post_id,),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Publish failed")
    return row_to_post(row)


@app.post("/api/ai/generate")
async def generate_ai(request: AIRequest):
    text = request.text or ""
    mode = request.mode
    ai_output = try_gemini(mode, text)
    if ai_output is None:
        ai_output = fallback_grammar_fix(text) if mode == "grammar" else fallback_summary(text)

    return StreamingResponse(stream_chunks(ai_output), media_type="text/event-stream")
