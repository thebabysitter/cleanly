-- Backfill cleaner_profile_id for existing cleaners using matching profile emails
UPDATE cleaners
SET cleaner_profile_id = profiles.id
FROM profiles
WHERE cleaners.cleaner_profile_id IS NULL
  AND cleaners.email IS NOT NULL
  AND LOWER(cleaners.email) = LOWER(profiles.email);


