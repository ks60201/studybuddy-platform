-- Create user_notes table for lecture note-taking
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    lecture_type VARCHAR(100) NOT NULL, -- e.g., "physics_waves_level1"
    lecture_section VARCHAR(100), -- e.g., "introduction", "what_are_waves"
    note_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lecture_timestamp VARCHAR(50), -- timestamp within the lecture when note was taken
    is_active BOOLEAN DEFAULT true, -- for soft delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_lecture_type ON user_notes(lecture_type);
CREATE INDEX IF NOT EXISTS idx_user_notes_lecture_section ON user_notes(lecture_section);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_active ON user_notes(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_notes
CREATE POLICY "Users can view their own notes" ON user_notes
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert their own notes" ON user_notes
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own notes" ON user_notes
    FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can delete their own notes" ON user_notes
    FOR DELETE USING (user_id = auth.uid()::uuid);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_notes_updated_at 
    BEFORE UPDATE ON user_notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_notes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_notes IS 'User-specific notes taken during lectures';
COMMENT ON COLUMN user_notes.id IS 'Unique identifier for the note';
COMMENT ON COLUMN user_notes.user_id IS 'ID of the user who created the note';
COMMENT ON COLUMN user_notes.content IS 'The actual note content';
COMMENT ON COLUMN user_notes.lecture_type IS 'Type/identifier of the lecture (e.g., physics_waves_level1)';
COMMENT ON COLUMN user_notes.lecture_section IS 'Specific section of the lecture when note was taken';
COMMENT ON COLUMN user_notes.note_timestamp IS 'When the note was created';
COMMENT ON COLUMN user_notes.lecture_timestamp IS 'Timestamp within the lecture context';
COMMENT ON COLUMN user_notes.is_active IS 'Whether the note is active (for soft delete)';
