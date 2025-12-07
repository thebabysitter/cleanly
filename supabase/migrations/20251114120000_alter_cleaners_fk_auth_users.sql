-- Switch cleaners.cleaner_profile_id FK to reference auth.users instead of profiles
ALTER TABLE cleaners
  DROP CONSTRAINT IF EXISTS cleaners_cleaner_profile_id_fkey;

ALTER TABLE cleaners
  ADD CONSTRAINT cleaners_cleaner_profile_id_fkey
  FOREIGN KEY (cleaner_profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;


