insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pixvo-private','pixvo-private',false,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','video/mp4','video/webm']) on conflict(id) do nothing;
-- Uploads pass through the server: bytes are inspected before storage.
create policy pixvo_media_owner on storage.objects for select to authenticated using(bucket_id='pixvo-private' and (storage.foldername(name))[1]=auth.uid()::text);
