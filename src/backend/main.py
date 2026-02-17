from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
from datetime import datetime
import google.generativeai as genai
import os

# 1. Initialize 'app' FIRST so decorators work
app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup (SQLite) ---
def init_db():
    conn = sqlite3.connect('blog.db')
    c = conn.cursor()
    # Schema designed to store Lexical JSON state + metadata
    c.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- Pydantic Models ---
class AIRequest(BaseModel):
    text: str

class PostCreate(BaseModel):
    content: str # Stores JSON string from Lexical

class PostUpdate(BaseModel):
    content: str

# --- Endpoints ---

@app.post("/api/ai/generate")
def generate_summary(req: AIRequest):
    # Configure your API key here or using environment variables if you want it to work
    # genai.configure(api_key=os.environ["GEMZ_API_KEY"]) 
    
    # Mock response for assignment demo
    return {"summary": f"AI Summary: This post talks about {req.text[:20]}..."}

@app.post("/api/posts/")
def create_post(post: PostCreate):
    conn = sqlite3.connect('blog.db')
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute(
        "INSERT INTO posts (content, status, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (post.content, 'draft', now, now)
    )
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": new_id, "status": "created"}

@app.patch("/api/posts/{post_id}")
def update_post(post_id: int, post: PostUpdate):
    conn = sqlite3.connect('blog.db')
    c = conn.cursor()
    now = datetime.now().isoformat()
    
    # Check if exists
    c.execute("SELECT id FROM posts WHERE id=?", (post_id,))
    if not c.fetchone():
        conn.close()
        # 2. Fixed the 'Jf' typo here
        raise HTTPException(status_code=404, detail="Post not found")

    c.execute(
        "UPDATE posts SET content=?, updated_at=? WHERE id=?",
        (post.content, now, post_id)
    )
    conn.commit()
    conn.close()
    return {"id": post_id, "status": "updated", "timestamp": now}

@app.post("/api/posts/{post_id}/publish")
def publish_post(post_id: int):
    conn = sqlite3.connect('blog.db')
    c = conn.cursor()
    c.execute("UPDATE posts SET status='published' WHERE id=?", (post_id,))
    conn.commit()
    conn.close()
    return {"status": "published"}
