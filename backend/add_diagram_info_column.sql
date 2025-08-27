-- Add diagram_info column to saved_lectures table
ALTER TABLE saved_lectures 
ADD COLUMN IF NOT EXISTS diagram_info JSONB;

-- Add comment for documentation
COMMENT ON COLUMN saved_lectures.diagram_info IS 'Diagram information including image filename, path, and metadata'; 