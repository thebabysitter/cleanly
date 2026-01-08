-- Allow cleaners to delete their own cleanings (i.e., cleanings assigned to the authenticated cleaner)
-- This complements the existing host delete policy.

DROP POLICY IF EXISTS "Cleaners can delete their own cleanings" ON cleanings;

CREATE POLICY "Cleaners can delete their own cleanings"
  ON cleanings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM cleaners
      WHERE cleaners.id = cleanings.cleaner_id
        AND cleaners.cleaner_profile_id = (select auth.uid())
    )
  );


