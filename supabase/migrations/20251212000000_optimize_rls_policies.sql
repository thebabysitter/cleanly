/*
  Optimize RLS policies to avoid unnecessary re-evaluation of auth.uid()
  
  This migration addresses the "Auth RLS Initialization Plan" warnings by wrapping
  auth.uid() calls in a subquery: (select auth.uid()).
  This allows the result to be cached per query instead of re-evaluated for each row.
*/

-- Profiles
ALTER POLICY "Users can view own profile" ON profiles
USING ((select auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON profiles
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can insert own profile" ON profiles
WITH CHECK ((select auth.uid()) = id);

-- Properties
ALTER POLICY "Hosts can view own properties" ON properties
USING (host_id = (select auth.uid()));

ALTER POLICY "Hosts can insert own properties" ON properties
WITH CHECK (host_id = (select auth.uid()));

ALTER POLICY "Hosts can update own properties" ON properties
USING (host_id = (select auth.uid()))
WITH CHECK (host_id = (select auth.uid()));

ALTER POLICY "Hosts can delete own properties" ON properties
USING (host_id = (select auth.uid()));

ALTER POLICY "Cleaners can view host properties they work for" ON properties
USING (
  EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.host_id = properties.host_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

-- Cleaners
ALTER POLICY "Hosts can view own cleaners" ON cleaners
USING (host_id = (select auth.uid()));

ALTER POLICY "Cleaners can view their profile" ON cleaners
USING (cleaner_profile_id = (select auth.uid()));

ALTER POLICY "Hosts can insert own cleaners" ON cleaners
WITH CHECK (host_id = (select auth.uid()));

ALTER POLICY "Hosts can update own cleaners" ON cleaners
USING (host_id = (select auth.uid()))
WITH CHECK (host_id = (select auth.uid()));

ALTER POLICY "Hosts can delete own cleaners" ON cleaners
USING (host_id = (select auth.uid()));

-- Cleanings
ALTER POLICY "Hosts can view cleanings for own properties" ON cleanings
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = cleanings.property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can view their assigned cleanings" ON cleanings
USING (
  EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = cleanings.cleaner_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can insert cleanings for own properties" ON cleanings
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can update cleanings for own properties" ON cleanings
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = cleanings.property_id
    AND properties.host_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can update their assigned cleanings" ON cleanings
USING (
  EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = cleanings.cleaner_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = cleaner_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can delete cleanings for own properties" ON cleanings
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = cleanings.property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can insert their own cleanings" ON cleanings
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM properties
    JOIN cleaners ON cleaners.host_id = properties.host_id
    WHERE properties.id = cleanings.property_id
      AND cleaners.id = cleanings.cleaner_id
      AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

-- Cleaning Media
ALTER POLICY "Anyone with cleaning access can view media" ON cleaning_media
USING (
  EXISTS (
    SELECT 1 FROM cleanings
    JOIN properties ON properties.id = cleanings.property_id
    WHERE cleanings.id = cleaning_media.cleaning_id
    AND properties.host_id = (select auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM cleanings
    JOIN cleaners ON cleaners.id = cleanings.cleaner_id
    WHERE cleanings.id = cleaning_media.cleaning_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can upload media for their cleanings" ON cleaning_media
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cleanings
    JOIN cleaners ON cleaners.id = cleanings.cleaner_id
    WHERE cleanings.id = cleaning_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can delete media for their properties" ON cleaning_media
USING (
  EXISTS (
    SELECT 1 FROM cleanings
    JOIN properties ON properties.id = cleanings.property_id
    WHERE cleanings.id = cleaning_media.cleaning_id
    AND properties.host_id = (select auth.uid())
  )
);

-- Property Tasks
ALTER POLICY "Hosts can view tasks for own properties" ON property_tasks
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_tasks.property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can insert tasks for own properties" ON property_tasks
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can update tasks for own properties" ON property_tasks
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_tasks.property_id
    AND properties.host_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Hosts can delete tasks for own properties" ON property_tasks
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_tasks.property_id
    AND properties.host_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can view tasks for host properties" ON property_tasks
USING (
  EXISTS (
    SELECT 1
    FROM properties
    JOIN cleaners ON cleaners.host_id = properties.host_id
    WHERE properties.id = property_tasks.property_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

ALTER POLICY "Cleaners can update tasks for host properties" ON property_tasks
USING (
  EXISTS (
    SELECT 1
    FROM properties
    JOIN cleaners ON cleaners.host_id = properties.host_id
    WHERE properties.id = property_tasks.property_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM properties
    JOIN cleaners ON cleaners.host_id = properties.host_id
    WHERE properties.id = property_tasks.property_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);

-- Cleaner Payouts
ALTER POLICY "Hosts can view own payouts" ON cleaner_payouts
USING (host_id = (select auth.uid()));

ALTER POLICY "Hosts can insert own payouts" ON cleaner_payouts
WITH CHECK (host_id = (select auth.uid()));

ALTER POLICY "Cleaners can view own payouts" ON cleaner_payouts
USING (
  EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = cleaner_payouts.cleaner_id
    AND cleaners.cleaner_profile_id = (select auth.uid())
  )
);
