-- Preserve custom bucket policies while allowing inspected M4A audio.
update storage.buckets set allowed_mime_types = array(select distinct unnest(allowed_mime_types || array['audio/mp4','audio/x-m4a'])) where id='pixvo-private' and allowed_mime_types is not null;
