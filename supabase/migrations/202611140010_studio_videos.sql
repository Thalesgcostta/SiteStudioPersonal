-- Seleção de vídeos do YouTube para o portfólio público.
-- Execute após a migração 009. Não altera planos, alunos ou dados financeiros.
begin;

create or replace function public.valid_studio_video_list(items jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) > 4 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'videoId') is distinct from 'string'
      or jsonb_typeof(item->'title') is distinct from 'string'
      or (item - array['videoId','title']) <> '{}'::jsonb
      or (item->>'videoId') !~ '^[A-Za-z0-9_-]{11}$'
      or length(item->>'title') not between 1 and 120
      or item->>'title' <> regexp_replace(item->>'title', '^[[:space:]]+|[[:space:]]+$', '', 'g') then
      return false;
    end if;
  end loop;
  return (select count(distinct value->>'videoId') = jsonb_array_length(items)
    from jsonb_array_elements(items));
end $$;
revoke all on function public.valid_studio_video_list(jsonb) from public, anon, authenticated;

create table if not exists public.studio_videos (
  singleton boolean primary key default true check (singleton),
  version integer not null default 0 check (version >= 0),
  videos jsonb not null default '[]'::jsonb check (public.valid_studio_video_list(videos))
);
-- Vídeo inicial indicado pela Katielle. Os demais espaços ficam sem seleção.
-- Em instalações já configuradas, a seleção editorial existente é preservada.
insert into public.studio_videos(singleton, videos)
values (true, '[{"videoId":"ZsS8bJw2i9k","title":"Um pouco do Studio Katielle Faleiros"}]'::jsonb)
on conflict do nothing;
alter table public.studio_videos enable row level security;
revoke all on public.studio_videos from public, anon, authenticated;

-- Somente a seleção editorial é pública; nenhuma informação da gestão é exposta.
create or replace function public.get_public_studio_videos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version', version, 'videos', videos)
  from public.studio_videos where singleton;
$$;
revoke all on function public.get_public_studio_videos() from public, anon, authenticated;
grant execute on function public.get_public_studio_videos() to anon, authenticated;

create or replace function public.get_studio_videos()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_studio_admin() then
    raise exception 'Acesso restrito à administração do studio.' using errcode = '42501';
  end if;
  return public.get_public_studio_videos();
end $$;
revoke all on function public.get_studio_videos() from public, anon, authenticated;
grant execute on function public.get_studio_videos() to authenticated;

create or replace function public.save_studio_videos(p_videos jsonb, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_version integer;
begin
  if not public.is_studio_admin() then
    raise exception 'Acesso restrito à administração do studio.' using errcode = '42501';
  end if;
  if not public.valid_studio_video_list(p_videos)
    or p_expected_version is null or p_expected_version < 0 then
    raise exception 'Informe até quatro vídeos diferentes, com ID do YouTube e título de 1 a 120 caracteres.' using errcode = '22023';
  end if;
  select version into current_version from public.studio_videos where singleton for update;
  if current_version is distinct from p_expected_version then
    raise exception 'Os vídeos foram alterados em outra sessão. Recarregue a seleção antes de salvar.' using errcode = '22023';
  end if;
  update public.studio_videos set videos = p_videos, version = version + 1 where singleton;
  return public.get_public_studio_videos();
end $$;
revoke all on function public.save_studio_videos(jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_studio_videos(jsonb,integer) to authenticated;

notify pgrst, 'reload schema';
commit;
