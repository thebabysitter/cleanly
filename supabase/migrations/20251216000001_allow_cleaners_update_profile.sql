
-- Allow cleaners to update their own profile (e.g. payment details)

-- Drop existing policy if it exists to allow re-running this migration
DROP POLICY IF EXISTS "Cleaners can update their own profile" ON cleaners;

CREATE POLICY "Cleaners can update their own profile"
  ON cleaners FOR UPDATE
  TO authenticated
  USING (cleaner_profile_id = (select auth.uid()))
  WITH CHECK (cleaner_profile_id = (select auth.uid()));
