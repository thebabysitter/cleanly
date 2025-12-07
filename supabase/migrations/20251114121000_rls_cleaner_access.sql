-- Allow cleaners to view their host's properties
CREATE POLICY "Cleaners can view host properties they work for"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.host_id = properties.host_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

-- Allow cleaners to view tasks for those properties
CREATE POLICY "Cleaners can view tasks for host properties"
  ON property_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM properties
      JOIN cleaners ON cleaners.host_id = properties.host_id
      WHERE properties.id = property_tasks.property_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

-- Allow cleaners to update tasks (mark done) for those properties
CREATE POLICY "Cleaners can update tasks for host properties"
  ON property_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM properties
      JOIN cleaners ON cleaners.host_id = properties.host_id
      WHERE properties.id = property_tasks.property_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties
      JOIN cleaners ON cleaners.host_id = properties.host_id
      WHERE properties.id = property_tasks.property_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );


