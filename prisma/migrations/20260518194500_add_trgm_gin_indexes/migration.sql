-- Enable the pg_trgm extension if it doesn't already exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on the title column of the notes table
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON "notes" USING gin ("title" gin_trgm_ops);

-- Create a GIN index on the content column of the notes table
CREATE INDEX IF NOT EXISTS idx_notes_content_trgm ON "notes" USING gin ("content" gin_trgm_ops);
