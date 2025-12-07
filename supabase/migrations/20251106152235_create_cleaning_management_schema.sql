/*
  # Airbnb Cleaning Management System

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - 'host' or 'cleaner'
      - `phone` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `properties`
      - `id` (uuid, primary key)
      - `host_id` (uuid, references profiles)
      - `name` (text) - property name/identifier
      - `address` (text)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `cleaners`
      - `id` (uuid, primary key)
      - `host_id` (uuid, references profiles) - which host this cleaner works for
      - `cleaner_profile_id` (uuid, references profiles, optional) - if cleaner has account
      - `name` (text)
      - `email` (text, optional)
      - `phone` (text, optional)
      - `hourly_rate` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `cleanings`
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `cleaner_id` (uuid, references cleaners)
      - `scheduled_date` (timestamp)
      - `completed_at` (timestamp, optional)
      - `status` (text) - 'scheduled', 'in_progress', 'completed', 'cancelled'
      - `duration_hours` (numeric, optional)
      - `amount` (numeric, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `cleaning_media`
      - `id` (uuid, primary key)
      - `cleaning_id` (uuid, references cleanings)
      - `media_url` (text) - URL to image/video
      - `media_type` (text) - 'image' or 'video'
      - `uploaded_at` (timestamp)
    
    - `property_tasks`
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `task` (text)
      - `completed` (boolean)
      - `order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Hosts can manage their own properties, cleaners, and cleanings
    - Cleaners can view their assigned cleanings and upload media
    - Policies for authenticated access with proper ownership checks
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'cleaner')),
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own properties"
  ON properties FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can insert own properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can delete own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- Create cleaners table
CREATE TABLE IF NOT EXISTS cleaners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cleaner_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  hourly_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own cleaners"
  ON cleaners FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "Cleaners can view their profile"
  ON cleaners FOR SELECT
  TO authenticated
  USING (cleaner_profile_id = auth.uid());

CREATE POLICY "Hosts can insert own cleaners"
  ON cleaners FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update own cleaners"
  ON cleaners FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can delete own cleaners"
  ON cleaners FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- Create cleanings table
CREATE TABLE IF NOT EXISTS cleanings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  scheduled_date timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  duration_hours numeric,
  amount numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cleanings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view cleanings for own properties"
  ON cleanings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = cleanings.property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can view their assigned cleanings"
  ON cleanings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.id = cleanings.cleaner_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can insert cleanings for own properties"
  ON cleanings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update cleanings for own properties"
  ON cleanings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = cleanings.property_id
      AND properties.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can update their assigned cleanings"
  ON cleanings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.id = cleanings.cleaner_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.id = cleaner_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete cleanings for own properties"
  ON cleanings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = cleanings.property_id
      AND properties.host_id = auth.uid()
    )
  );

-- Create cleaning_media table
CREATE TABLE IF NOT EXISTS cleaning_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_id uuid NOT NULL REFERENCES cleanings(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE cleaning_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with cleaning access can view media"
  ON cleaning_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleanings
      JOIN properties ON properties.id = cleanings.property_id
      WHERE cleanings.id = cleaning_media.cleaning_id
      AND properties.host_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM cleanings
      JOIN cleaners ON cleaners.id = cleanings.cleaner_id
      WHERE cleanings.id = cleaning_media.cleaning_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can upload media for their cleanings"
  ON cleaning_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleanings
      JOIN cleaners ON cleaners.id = cleanings.cleaner_id
      WHERE cleanings.id = cleaning_id
      AND cleaners.cleaner_profile_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete media for their properties"
  ON cleaning_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cleanings
      JOIN properties ON properties.id = cleanings.property_id
      WHERE cleanings.id = cleaning_media.cleaning_id
      AND properties.host_id = auth.uid()
    )
  );

-- Create property_tasks table
CREATE TABLE IF NOT EXISTS property_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  task text NOT NULL,
  completed boolean DEFAULT false,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE property_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view tasks for own properties"
  ON property_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_tasks.property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can insert tasks for own properties"
  ON property_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update tasks for own properties"
  ON property_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_tasks.property_id
      AND properties.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete tasks for own properties"
  ON property_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_tasks.property_id
      AND properties.host_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);
CREATE INDEX IF NOT EXISTS idx_cleaners_host_id ON cleaners(host_id);
CREATE INDEX IF NOT EXISTS idx_cleaners_profile_id ON cleaners(cleaner_profile_id);
CREATE INDEX IF NOT EXISTS idx_cleanings_property_id ON cleanings(property_id);
CREATE INDEX IF NOT EXISTS idx_cleanings_cleaner_id ON cleanings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleanings_scheduled_date ON cleanings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_media_cleaning_id ON cleaning_media(cleaning_id);
CREATE INDEX IF NOT EXISTS idx_property_tasks_property_id ON property_tasks(property_id);
