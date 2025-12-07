-- Allow cleaners to INSERT cleanings for properties owned by their host,
-- but only for themselves (cleaner_id must match the authenticated cleaner).
CREATE POLICY "Cleaners can insert their own cleanings"
  ON cleanings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties
      JOIN cleaners ON cleaners.host_id = properties.host_id
      WHERE properties.id = cleanings.property_id
        AND cleaners.id = cleanings.cleaner_id
        AND cleaners.cleaner_profile_id = auth.uid()
    )
  );


