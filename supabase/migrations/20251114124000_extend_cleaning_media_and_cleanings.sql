-- Add category and captured_at to cleaning_media
ALTER TABLE cleaning_media
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz DEFAULT now();

COMMENT ON COLUMN cleaning_media.category IS 'start | after | receipt';
COMMENT ON COLUMN cleaning_media.captured_at IS 'When the photo was taken (client-provided timestamp)';

-- Add transport_cost to cleanings
ALTER TABLE cleanings
  ADD COLUMN IF NOT EXISTS transport_cost numeric DEFAULT 0;


