from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI()

# 1. Allow React to talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Post(BaseModel):
    content: str

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}

@app.post("/api/save")
def save_post(post: Post):
    # Simulate saving to database
    print(f"📝 Saving content: {post.content[:30]}...")
    return {"status": "saved", "timestamp": time.time()}