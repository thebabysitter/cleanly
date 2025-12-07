-- Create Storage bucket for cleaning media and policies
insert into storage.buckets (id, name, public)
values ('cleaning-media', 'cleaning-media', true)
on conflict (id) do nothing;

-- Allow anyone to read objects from this bucket (public)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read cleaning-media'
  ) then
    create policy "Public read cleaning-media"
      on storage.objects for select
      using (bucket_id = 'cleaning-media');
  end if;
end $$;

-- Allow authenticated users to upload new objects into this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload cleaning-media'
  ) then
    create policy "Authenticated upload cleaning-media"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'cleaning-media');
  end if;
end $$;

-- Allow authenticated users to update objects in this bucket (needed for upsert)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated update cleaning-media'
  ) then
    create policy "Authenticated update cleaning-media"
      on storage.objects for update to authenticated
      using (bucket_id = 'cleaning-media')
      with check (bucket_id = 'cleaning-media');
  end if;
end $$;


