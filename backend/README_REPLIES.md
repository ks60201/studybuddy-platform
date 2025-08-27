# Reply Functionality Setup

This document explains how to set up the reply functionality for comments in your Study Buddy application.

## Database Setup

### 1. Create the Replies Table

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Create replies table
CREATE TABLE IF NOT EXISTS replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_username TEXT NOT NULL,
    image_url TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add reply_count column to comments table if it doesn't exist
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_author_id ON replies(author_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for replies
CREATE POLICY "Users can view all replies" ON replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON replies
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own replies" ON replies
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own replies" ON replies
    FOR DELETE USING (auth.uid() = author_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Update Existing Comments

If you have existing comments, update them to have a reply_count:

```sql
-- Update existing comments to have reply_count = 0
UPDATE comments SET reply_count = 0 WHERE reply_count IS NULL;
```

## Features Added

### Backend Features

- **Reply Creation**: POST `/connection/replies` - Create replies to comments
- **Reply Fetching**: GET `/connection/comments/{comment_id}/replies` - Get all replies for a comment
- **Reply Voting**: Updated vote endpoint to support reply voting
- **Image Upload**: Replies support image uploads (up to 10MB)
- **Reply Count**: Comments now track the number of replies

### Frontend Features

- **Reply Button**: Each comment has a "Reply" button showing reply count
- **Nested Replies**: Replies are displayed indented under comments
- **Reply Form**: Collapsible form to add replies with image upload
- **Reply Voting**: Upvote/downvote functionality for replies
- **Responsive Design**: Mobile-friendly reply interface

## How It Works

1. **Comment Display**: Comments show a reply count and a "Reply" button
2. **Reply Expansion**: Clicking "Reply" expands the reply section for that comment
3. **Reply Creation**: Users can write replies with optional images
4. **Nested Structure**: Replies are visually nested under their parent comments
5. **Voting**: Both comments and replies support upvoting/downvoting
6. **Real-time Updates**: Reply counts update automatically when replies are added

## File Structure

```
frontend/src/components/
├── CommentSection.tsx (updated with reply functionality)
├── CommentSection.css (updated styles)
├── ReplySection.tsx (new component)
└── ReplySection.css (new styles)

backend/
├── connection.py (updated with reply endpoints)
├── main.py (updated with replies upload directory)
└── database_setup.sql (new database schema)
```

## Usage

1. **View Comments**: Comments display with reply counts
2. **Add Reply**: Click "Reply" on any comment to expand the reply form
3. **Write Reply**: Enter text and optionally upload an image
4. **Vote on Replies**: Use thumbs up/down buttons on replies
5. **Collapse Replies**: Click "Reply" again to hide the reply section

The reply system provides a complete nested commenting experience with all the same features as regular comments!
