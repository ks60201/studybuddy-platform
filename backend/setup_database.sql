-- Add grade column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade >= 1 AND grade <= 12);

-- Create index for grade
CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    school_name VARCHAR(100) NOT NULL,
    grade INTEGER CHECK (grade >= 1 AND grade <= 12),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    author_username VARCHAR(50) NOT NULL,
    image_url TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    author_username VARCHAR(50) NOT NULL,
    image_url TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_school_name ON posts(school_name);
CREATE INDEX IF NOT EXISTS idx_posts_grade ON posts(grade);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Posts are viewable by everyone" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid()::text = author_id::text);

-- Create policies for comments
CREATE POLICY "Comments are viewable by everyone" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid()::text = author_id::text);

-- Create saved_lectures table
CREATE TABLE IF NOT EXISTS saved_lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,  -- Use email instead of UUID for custom auth
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class_level VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transcript JSONB NOT NULL,
    qa_interactions JSONB NOT NULL,
    sections TEXT[] NOT NULL,
    total_sections INTEGER NOT NULL,
    diagram_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_saved_lectures_user_id ON saved_lectures(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lectures_subject ON saved_lectures(subject);
CREATE INDEX IF NOT EXISTS idx_saved_lectures_class_level ON saved_lectures(class_level);

-- Enable Row Level Security
ALTER TABLE saved_lectures ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_lectures (using service role key, so no RLS needed)
-- RLS is disabled for saved_lectures since we're using service role key 