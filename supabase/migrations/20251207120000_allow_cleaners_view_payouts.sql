CREATE POLICY "Cleaners can view own payouts"
  ON cleaner_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.id = cleaner_payouts.cleaner_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );
