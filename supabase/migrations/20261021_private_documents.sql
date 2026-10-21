begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bike-documents','bike-documents',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy bike_document_read on storage.objects for select to authenticated
 using(bucket_id='bike-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy bike_document_insert on storage.objects for insert to authenticated
 with check(bucket_id='bike-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.bp_bikes b where b.id::text=(storage.foldername(name))[2] and b.user_id=(select auth.uid())));
create policy bike_document_delete on storage.objects for delete to authenticated
 using(bucket_id='bike-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
