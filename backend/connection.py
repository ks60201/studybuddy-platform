from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import jwt
import uuid
import os
from supabase import create_client
from config import supabase, SECRET_KEY, ALGORITHM, SERVICE_ROLE_KEY, SUPABASE_URL
from auth import get_current_user_token, TokenData, get_current_user_data

router = APIRouter(
    prefix="/connection",
    tags=["Student Connection"],
)

# Security
security = HTTPBearer()

# Pydantic models
class PostCreate(BaseModel):
    title: str
    description: str
    school_name: str

class PostResponse(BaseModel):
    id: str
    title: str
    description: str
    school_name: str
    author_id: str
    author_name: str
    author_username: str
    image_url: Optional[str] = None
    upvotes: int
    downvotes: int
    comment_count: int
    created_at: datetime
    updated_at: datetime

class CommentCreate(BaseModel):
    content: str
    post_id: str

class ReplyCreate(BaseModel):
    content: str
    comment_id: str

class ReplyResponse(BaseModel):
    id: str
    content: str
    comment_id: str
    author_id: str
    author_name: str
    author_username: str
    image_url: Optional[str] = None
    upvotes: int
    downvotes: int
    created_at: datetime

class CommentResponse(BaseModel):
    id: str
    content: str
    post_id: str
    author_id: str
    author_name: str
    author_username: str
    image_url: Optional[str] = None
    upvotes: int
    downvotes: int
    reply_count: int
    created_at: datetime

class VoteRequest(BaseModel):
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    reply_id: Optional[str] = None
    vote_type: str  # "upvote" or "downvote"

# Utility functions
def get_user_by_email(email: str):
    result = supabase.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result.data[0]

async def save_upload_file(upload_file: UploadFile, folder: str) -> str:
    """Save uploaded file and return the URL"""
    if not upload_file:
        return None
    
    try:
        # Check file size (10MB limit)
        if upload_file.size and upload_file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 10MB")
        
        # Generate unique filename
        file_extension = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
        filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create uploads directory if it doesn't exist
        upload_dir = f"uploads/{folder}"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = f"{upload_dir}/{filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await upload_file.read()
            buffer.write(content)
        
        # Verify file was saved
        if not os.path.exists(file_path):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save file")
        
        # Return relative URL
        image_url = f"/uploads/{folder}/{filename}"
        print(f"Image saved successfully: {image_url}")
        return image_url
        
    except Exception as e:
        print(f"Error saving image: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save image: {str(e)}")

# Routes
@router.post("/posts", response_model=PostResponse)
async def create_post(
    title: str = Form(...),
    description: str = Form(...),
    school_name: str = Form(...),
            image: Optional[UploadFile] = File(None),
        token_data: TokenData = Depends(get_current_user_token)
):
    try:
        user = get_user_by_email(token_data.email)
        
        # Save image if provided
        image_url = None
        if image:
            print(f"Processing image upload: {image.filename}")
            image_url = await save_upload_file(image, "posts")
            print(f"Image URL saved: {image_url}")
        
        post_data = {
            "title": title,
            "description": description,
            "school_name": school_name,
            "author_id": user["id"],
            "author_name": user["full_name"],
            "author_username": user["username"],
            "image_url": image_url,
            "upvotes": 0,
            "downvotes": 0,
            "comment_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Use service role key to bypass RLS
        auth_supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        result = auth_supabase.table("posts").insert(post_data).execute()
        
        if result.data:
            return PostResponse(**result.data[0])
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create post")
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create post: {str(e)}")

@router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    school_filter: Optional[str] = None,
    grade_filter: Optional[str] = None,
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        # Get user data using the correct method
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please log in again."
            )
        
        query = supabase.table("posts").select("*").order("created_at", desc=True)
        
        if school_filter and school_filter.lower() != "all":
            query = query.eq("school_name", school_filter)
        
        # Add grade filtering - get posts from users in the same grade
        if grade_filter and grade_filter.lower() == "your class":
            # Get all users with the same grade as current user
            users_same_grade = supabase.table("users").select("id").eq("grade", user_data.grade).execute()
            if users_same_grade.data:
                user_ids = [user["id"] for user in users_same_grade.data]
                query = query.in_("author_id", user_ids)
        
        result = query.execute()
        
        if result.data:
            return [PostResponse(**post) for post in result.data]
        return []
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get posts: {str(e)}")

@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        result = supabase.table("posts").select("*").eq("id", post_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
        return PostResponse(**result.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get post: {str(e)}")

@router.post("/comments", response_model=CommentResponse)
async def create_comment(
    content: str = Form(...),
    post_id: str = Form(...),
    image: Optional[UploadFile] = File(None),
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        user = get_user_by_email(token_data.email)
        
        # Verify post exists
        post_result = supabase.table("posts").select("*").eq("id", post_id).execute()
        if not post_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
        # Save image if provided
        image_url = None
        if image:
            print(f"Processing comment image upload: {image.filename}")
            image_url = await save_upload_file(image, "comments")
            print(f"Comment image URL saved: {image_url}")
        
        comment_data = {
            "content": content,
            "post_id": post_id,
            "author_id": user["id"],
            "author_name": user["full_name"],
            "author_username": user["username"],
            "image_url": image_url,
            "upvotes": 0,
            "downvotes": 0,
            "reply_count": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Use service role key to bypass RLS
        auth_supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        result = auth_supabase.table("comments").insert(comment_data).execute()
        
        if result.data:
            # Update comment count on post
            supabase.table("posts").update({"comment_count": post_result.data[0]["comment_count"] + 1}).eq("id", post_id).execute()
            return CommentResponse(**result.data[0])
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create comment")
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create comment: {str(e)}")

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_post_comments(
    post_id: str,
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        result = supabase.table("comments").select("*").eq("post_id", post_id).order("created_at", desc=True).execute()
        
        if result.data:
            return [CommentResponse(**comment) for comment in result.data]
        return []
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get comments: {str(e)}")

@router.post("/replies", response_model=ReplyResponse)
async def create_reply(
    content: str = Form(...),
    comment_id: str = Form(...),
    image: Optional[UploadFile] = File(None),
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        user = get_user_by_email(token_data.email)
        
        # Verify comment exists
        comment_result = supabase.table("comments").select("*").eq("id", comment_id).execute()
        if not comment_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        
        # Save image if provided
        image_url = None
        if image:
            print(f"Processing reply image upload: {image.filename}")
            image_url = await save_upload_file(image, "replies")
            print(f"Reply image URL saved: {image_url}")
        
        reply_data = {
            "content": content,
            "comment_id": comment_id,
            "author_id": user["id"],
            "author_name": user["full_name"],
            "author_username": user["username"],
            "image_url": image_url,
            "upvotes": 0,
            "downvotes": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Use service role key to bypass RLS
        auth_supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        result = auth_supabase.table("replies").insert(reply_data).execute()
        
        if result.data:
            # Update reply count on comment
            supabase.table("comments").update({"reply_count": comment_result.data[0].get("reply_count", 0) + 1}).eq("id", comment_id).execute()
            return ReplyResponse(**result.data[0])
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create reply")
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create reply: {str(e)}")

@router.get("/comments/{comment_id}/replies", response_model=List[ReplyResponse])
async def get_comment_replies(
    comment_id: str,
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        result = supabase.table("replies").select("*").eq("comment_id", comment_id).order("created_at", desc=False).execute()
        
        if result.data:
            return [ReplyResponse(**reply) for reply in result.data]
        return []
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get replies: {str(e)}")

@router.post("/vote")
async def vote(
    vote_data: VoteRequest,
    token_data: TokenData = Depends(get_current_user_token)
):
    try:
        user = get_user_by_email(email)
        
        if vote_data.post_id:
            # Vote on post
            table = "posts"
            item_id = vote_data.post_id
            vote_column = "upvotes" if vote_data.vote_type == "upvote" else "downvotes"
        elif vote_data.comment_id:
            # Vote on comment
            table = "comments"
            item_id = vote_data.comment_id
            vote_column = "upvotes" if vote_data.vote_type == "upvote" else "downvotes"
        elif vote_data.reply_id:
            # Vote on reply
            table = "replies"
            item_id = vote_data.reply_id
            vote_column = "upvotes" if vote_data.vote_type == "upvote" else "downvotes"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either post_id, comment_id, or reply_id must be provided")
        
        # Get current item
        result = supabase.table(table).select("*").eq("id", item_id).execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        
        current_votes = result.data[0][vote_column]
        
        # Update votes
        supabase.table(table).update({vote_column: current_votes + 1}).eq("id", item_id).execute()
        
        return {"message": f"{vote_data.vote_type} successful"}
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to vote: {str(e)}")

@router.get("/schools")
async def get_schools(token_data: TokenData = Depends(get_current_user_token)):
    try:
        # Get user data using the correct method
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please log in again."
            )
        
        result = supabase.table("posts").select("school_name").execute()
        
        schools = set()
        for post in result.data:
            if post["school_name"]:
                schools.add(post["school_name"])
        
        return {"schools": sorted(list(schools))}
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get schools: {str(e)}") 