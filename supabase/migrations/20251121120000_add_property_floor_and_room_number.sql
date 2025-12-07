-- 20251121120000_add_property_floor_and_room_number.sql
-- Add optional floor and room_number columns to properties

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floor text NULL,
  ADD COLUMN IF NOT EXISTS room_number text NULL;

COMMENT ON COLUMN public.properties.floor IS 'Floor number or label, e.g. 12';
COMMENT ON COLUMN public.properties.room_number IS 'Room/door number, e.g. 12A';

COMMIT;

-- Down migration (rollback)
-- BEGIN;
-- ALTER TABLE public.properties
--   DROP COLUMN IF EXISTS floor,
--   DROP COLUMN IF EXISTS room_number;
-- COMMIT;


