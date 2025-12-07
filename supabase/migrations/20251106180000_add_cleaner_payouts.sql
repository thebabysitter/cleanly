-- Cleaner payouts history table
CREATE TABLE IF NOT EXISTS cleaner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  cleaning_id uuid NOT NULL REFERENCES cleanings(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cleaner_payouts ENABLE ROW LEVEL SECURITY;

-- Hosts can manage their own payouts
CREATE POLICY "Hosts can view own payouts"
  ON cleaner_payouts FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can insert own payouts"
  ON cleaner_payouts FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_payouts_host_id ON cleaner_payouts(host_id);
CREATE INDEX IF NOT EXISTS idx_payouts_cleaner_id ON cleaner_payouts(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_cleaning_id ON cleaner_payouts(cleaning_id);



