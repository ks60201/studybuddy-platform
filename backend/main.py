from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

import auth
import connection
import notes_api
from lectures.class7.science.physics.waves.level1 import router as physics_lecture_router
from ai_doubt_solver import router as ai_doubt_solver_router

# Initialize FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/posts", exist_ok=True)
os.makedirs("uploads/comments", exist_ok=True)
os.makedirs("uploads/replies", exist_ok=True)

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(connection.router)
app.include_router(notes_api.router)
app.include_router(physics_lecture_router)
app.include_router(ai_doubt_solver_router)

@app.get("/")
async def root():
    return {"message": "AI Study Buddy API is running!"}

@app.get("/countries")
async def get_countries():
    """Get list of available countries"""
    countries = [
        "United Kingdom", "United States", "Canada", "Australia", "Germany", 
        "France", "India", "China", "Japan", "Brazil", "Mexico", 
        "South Africa", "Nigeria", "Egypt", "Kenya", "Ghana", 
        "Morocco", "Tunisia", "Algeria", "Libya"
    ]
    return {"countries": countries}

if __name__ == "__main__":
    import uvicorn
    # Production mode - no reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False) 