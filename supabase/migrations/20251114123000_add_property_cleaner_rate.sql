-- Add per-property cleaner payout rate (in baht)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cleaner_rate_baht numeric NOT NULL DEFAULT 700;

-- Optional: comment for clarity
COMMENT ON COLUMN properties.cleaner_rate_baht IS 'Default payout per cleaning for this property (baht)';


