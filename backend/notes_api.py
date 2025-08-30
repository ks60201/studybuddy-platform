from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from auth import get_current_user_token, TokenData, get_current_user_data
from config import supabase, supabase_service

# Create router for general notes API
router = APIRouter(prefix="/api/notes", tags=["notes"])

class NoteRequest(BaseModel):
    content: str
    lecture_section: Optional[str] = None
    lecture_type: Optional[str] = "general"

class NoteUpdateRequest(BaseModel):
    note_id: str
    content: str

class NoteDeleteRequest(BaseModel):
    note_id: str

@router.get("/")
async def get_notes(
    lecture_type: Optional[str] = None,
    section: Optional[str] = None,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Get all notes for the current user, optionally filtered by lecture type and section"""
    try:
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build query
        query = supabase_service.table("user_notes").select("*").eq("user_id", user_data.id).eq("is_active", True)
        
        # Add filters if provided
        if lecture_type:
            query = query.eq("lecture_type", lecture_type)
        if section:
            query = query.eq("lecture_section", section)
        
        result = query.order("created_at", desc=True).execute()
        
        return {
            "status": "success",
            "data": {
                "notes": result.data if result.data else [],
                "total_notes": len(result.data) if result.data else 0,
                "user_id": user_data.id,
                "filtered_by_lecture_type": lecture_type,
                "filtered_by_section": section
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting notes: {str(e)}")

@router.get("/by-sections")
async def get_notes_by_sections(
    lecture_type: Optional[str] = None,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Get user's notes organized by lecture sections"""
    try:
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build query
        query = supabase_service.table("user_notes").select("*").eq("user_id", user_data.id).eq("is_active", True)
        
        if lecture_type:
            query = query.eq("lecture_type", lecture_type)
            
        result = query.order("created_at", desc=True).execute()
        
        # Organize notes by section and lecture type
        notes_by_section = {}
        notes_by_lecture_type = {}
        total_notes = 0
        
        if result.data:
            for note in result.data:
                section = note.get('lecture_section', 'general')
                ltype = note.get('lecture_type', 'general')
                
                # Group by section
                if section not in notes_by_section:
                    notes_by_section[section] = []
                notes_by_section[section].append(note)
                
                # Group by lecture type
                if ltype not in notes_by_lecture_type:
                    notes_by_lecture_type[ltype] = []
                notes_by_lecture_type[ltype].append(note)
                
                total_notes += 1
        
        return {
            "status": "success",
            "data": {
                "notes_by_section": notes_by_section,
                "notes_by_lecture_type": notes_by_lecture_type,
                "total_notes": total_notes,
                "sections": list(notes_by_section.keys()),
                "lecture_types": list(notes_by_lecture_type.keys()),
                "user_id": user_data.id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting notes by sections: {str(e)}")

@router.post("/add")
async def add_note(
    note_request: NoteRequest,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Add a new note"""
    try:
        print(f"📝 Add note request: content='{note_request.content[:50]}...', lecture_type='{note_request.lecture_type}', lecture_section='{note_request.lecture_section}'")
        
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            print("❌ User not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"✅ User found: {user_data.id}")
        
        # Save note to database
        note_data = {
            "user_id": user_data.id,
            "content": note_request.content,
            "lecture_type": note_request.lecture_type or "general",
            "lecture_section": note_request.lecture_section,
            "lecture_timestamp": datetime.now().isoformat()
        }
        
        print(f"📊 Note data to insert: {note_data}")
        
        result = supabase_service.table("user_notes").insert(note_data).execute()
        
        print(f"📋 Database result: {result}")
        print(f"📋 Result data: {result.data}")
        print(f"📋 Result count: {result.count}")
        
        if result.data:
            print("✅ Note saved successfully")
            return {
                "status": "success",
                "message": "Note added successfully",
                "note": result.data[0]
            }
        else:
            print("❌ No data returned from database")
            raise HTTPException(status_code=500, detail="Failed to save note")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Exception adding note: {e}")
        raise HTTPException(status_code=500, detail=f"Error adding note: {str(e)}")

@router.put("/update")
async def update_note(
    note_update: NoteUpdateRequest,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Update an existing note"""
    try:
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update note in database (RLS will ensure user can only update their own notes)
        result = supabase_service.table("user_notes").update({
            "content": note_update.content,
            "updated_at": datetime.now().isoformat()
        }).eq("id", note_update.note_id).eq("user_id", user_data.id).execute()
        
        if result.data:
            return {
                "status": "success",
                "message": "Note updated successfully",
                "note": result.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Note not found or you don't have permission to update it")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")

@router.delete("/delete")
async def delete_note(
    note_delete: NoteDeleteRequest,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Delete a note (soft delete)"""
    try:
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete note in database (RLS will ensure user can only delete their own notes)
        result = supabase_service.table("user_notes").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", note_delete.note_id).eq("user_id", user_data.id).execute()
        
        if result.data:
            return {
                "status": "success",
                "message": "Note deleted successfully",
                "deleted_note": result.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Note not found or you don't have permission to delete it")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")

@router.post("/clear")
async def clear_notes(
    lecture_type: Optional[str] = None,
    token_data: TokenData = Depends(get_current_user_token)
):
    """Clear all notes for the current user"""
    try:
        # Get user data
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build query for soft delete
        query = supabase_service.table("user_notes").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_data.id).eq("is_active", True)
        
        if lecture_type:
            query = query.eq("lecture_type", lecture_type)
            
        result = query.execute()
        
        notes_cleared = len(result.data) if result.data else 0
        
        return {
            "status": "success",
            "message": f"All {notes_cleared} notes cleared successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing notes: {str(e)}")
