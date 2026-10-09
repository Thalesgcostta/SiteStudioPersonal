begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('studio-documents','studio-documents',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists studio_documents_read on storage.objects;
drop policy if exists studio_documents_insert on storage.objects;
create policy studio_documents_read on storage.objects for select to authenticated
using(bucket_id='studio-documents' and (select public.is_studio_admin()));
create policy studio_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='studio-documents' and (select public.is_studio_admin())
  and (storage.foldername(name))[1]='receipts'
  and (storage.foldername(name))[2]=(select auth.uid())::text);
-- Sem políticas públicas, atualização ou exclusão de comprovantes pelo navegador.
commit;
