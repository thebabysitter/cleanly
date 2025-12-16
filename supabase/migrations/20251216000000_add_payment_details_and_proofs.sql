
-- Add payment_details_image to cleaners
ALTER TABLE cleaners
  ADD COLUMN IF NOT EXISTS payment_details_image text;

-- Add proof_of_payment_url to cleaner_payouts
ALTER TABLE cleaner_payouts
  ADD COLUMN IF NOT EXISTS proof_of_payment_url text;

-- Create storage bucket for cleaner documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaner-documents', 'cleaner-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for cleaner-documents bucket

-- Allow authenticated users to view files (simplified for now, ideally stricter)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'cleaner-documents' );

-- Allow cleaners to upload their own payment details
CREATE POLICY "Cleaners can upload payment details"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cleaner-documents' AND
  (storage.foldername(name))[1] = 'payment-details' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow cleaners to update their own payment details
CREATE POLICY "Cleaners can update payment details"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cleaner-documents' AND
  (storage.foldername(name))[1] = 'payment-details' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow hosts to upload proof of payment
-- We'll store proofs as payment-proofs/{host_id}/{timestamp-random}.jpg
CREATE POLICY "Hosts can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cleaner-documents' AND
  (storage.foldername(name))[1] = 'payment-proofs' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

