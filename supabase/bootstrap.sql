-- Pixvo Invitaciones: ejecutar completo en Supabase > SQL Editor > New query.

-- Generado con npm run db:bootstrap-sql. No editar; regenerar desde migraciones y catálogo.

-- Crea tablas, permisos, bucket privado y seed. No habilita pagos ni borra datos.

begin;

set local standard_conforming_strings = on;

select pg_advisory_xact_lock(hashtext('pixvo-bootstrap-v1'));

create table if not exists public.pixvo_migrations(name text primary key, applied_at timestamptz default now());

do $pixvo_guard$ begin
  if not exists (select 1 from public.pixvo_migrations where name='202610310001_platform.sql')
     and exists (select 1 from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name<>'pixvo_migrations') then
    raise exception 'Pixvo: la base no está vacía y no registra la migración inicial. No se aplicaron cambios. Revisar el esquema antes de continuar.';
  end if;
end $pixvo_guard$;

do $pixvo_apply_0$ begin
  if not exists (select 1 from public.pixvo_migrations where name='202610310001_platform.sql') then
    execute $pixvo_migration_0$
-- Supabase supplies auth.users, auth.uid(), anon/authenticated/service_role.
create table public.profiles (id uuid primary key references auth.users(id), display_name text not null default '', role text not null default 'owner' check(role in ('owner','admin')));
create function public.pixvo_is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
revoke all on function public.pixvo_is_admin() from public;
grant execute on function public.pixvo_is_admin() to anon,authenticated;
create table public.templates (id text primary key, version int not null, category text not null, config jsonb not null, active boolean not null default true);
create table public.plans (id text primary key, name text not null, price_minor int check(price_minor>0), currency text not null default 'ARS' check(currency='ARS'), entitlements jsonb not null, active boolean not null default true);
create table public.invitations (
 id uuid primary key, owner_id uuid not null references auth.users(id), slug text not null unique,
 draft_json jsonb not null, revision int not null default 1, published_version_id uuid,
 status text not null default 'draft' check(status in ('draft','published','paused','archived')),
 entitlement jsonb, entitlement_order_id uuid, expires_at timestamptz, republications int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.invitations(owner_id);
create table public.invitation_versions (id uuid primary key, invitation_id uuid not null references public.invitations(id), number int not null, document_json jsonb not null, created_at timestamptz not null default now(), unique(invitation_id,number));
alter table public.invitations add constraint published_version_fk foreign key(published_version_id) references public.invitation_versions(id);
create function public.pixvo_immutable_version() returns trigger language plpgsql as $$begin raise exception 'Published versions are immutable'; end$$;
create trigger immutable_versions before update or delete on public.invitation_versions for each row execute function public.pixvo_immutable_version();
create table public.media (id uuid primary key, owner_id uuid not null references auth.users(id), event_id uuid not null references public.invitations(id), storage_key text not null unique, mime text not null, bytes int not null check(bytes>0), filename text not null, state text not null default 'ready' check(state in('ready','deleted')),created_at timestamptz not null default now());
create table public.version_media (version_id uuid references public.invitation_versions(id),media_id uuid references public.media(id),primary key(version_id,media_id));
create table public.guest_parties (id uuid primary key,event_id uuid not null references public.invitations(id), token_hash text not null unique, max_attendees int not null check(max_attendees between 1 and 20),label text not null, created_at timestamptz not null default now());
create table public.rsvps (id uuid primary key,event_id uuid not null references public.invitations(id),guest_party_id uuid not null references public.guest_parties(id),name text not null,response text not null check(response in('yes','no')),attendees int not null check(attendees between 0 and 20),diet text not null default '',message text not null default '',version int not null default 1,updated_at timestamptz not null default now(),unique(event_id,guest_party_id));
create table public.song_requests (id uuid primary key,event_id uuid not null references public.invitations(id),title text not null,artist text not null,url text not null default '',created_at timestamptz not null default now());
create table public.orders (id uuid primary key,owner_id uuid not null references auth.users(id),invitation_id uuid not null references public.invitations(id),plan_snapshot jsonb not null,amount_minor int not null check(amount_minor>0),currency text not null check(currency='ARS'),status text not null default 'pending' check(status in('pending','approved','rejected','refunded','charged_back')),preference_id text,checkout_url text,created_at timestamptz not null default now());
alter table public.invitations add constraint entitlement_order_fk foreign key(entitlement_order_id) references public.orders(id);
create table public.payments (provider_id text primary key,order_id uuid not null references public.orders(id),status text not null,amount_minor int not null,currency text not null,updated_at timestamptz not null default now());
create table public.webhook_events (provider_event_id text primary key,received_at timestamptz not null default now(),processed_at timestamptz,result text not null);
create table public.audit_log (id uuid primary key,actor_id uuid,action text not null,entity_id text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table public.custom_requests (id uuid primary key,owner_id uuid not null references auth.users(id),brief text not null,state text not null default 'received' check(state in('received','in_progress','delivered')),delivery_url text not null default '',created_at timestamptz not null default now());
create table public.rate_limits (key text primary key,hits int not null,window_at timestamptz not null);

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.pixvo_is_admin());
alter table public.templates enable row level security;
create policy templates_read on public.templates for select to anon,authenticated using(active or public.pixvo_is_admin());
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to anon,authenticated using(active or public.pixvo_is_admin());
alter table public.invitations enable row level security;
create policy invitations_read on public.invitations for select to authenticated using(owner_id=auth.uid() or public.pixvo_is_admin());
alter table public.invitation_versions enable row level security;
create policy versions_read on public.invitation_versions for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and(i.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.media enable row level security;
create policy media_read on public.media for select to authenticated using(owner_id=auth.uid() or public.pixvo_is_admin());
alter table public.version_media enable row level security;
create policy version_media_read on public.version_media for select to authenticated using(exists(select 1 from public.media m where m.id=media_id and(m.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.guest_parties enable row level security;
create policy guests_read on public.guest_parties for select to authenticated using(exists(select 1 from public.invitations i where i.id=event_id and(i.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.rsvps enable row level security;
create policy rsvps_read on public.rsvps for select to authenticated using(exists(select 1 from public.invitations i where i.id=event_id and(i.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.song_requests enable row level security;
create policy songs_read on public.song_requests for select to authenticated using(exists(select 1 from public.invitations i where i.id=event_id and(i.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.orders enable row level security;
create policy orders_read on public.orders for select to authenticated using(owner_id=auth.uid() or public.pixvo_is_admin());
alter table public.payments enable row level security;
create policy payments_read on public.payments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and(o.owner_id=auth.uid() or public.pixvo_is_admin())));
alter table public.custom_requests enable row level security;
create policy requests_read on public.custom_requests for select to authenticated using(owner_id=auth.uid() or public.pixvo_is_admin());
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select to authenticated using(public.pixvo_is_admin());
alter table public.webhook_events enable row level security;
alter table public.rate_limits enable row level security;
-- Browser Data API is read-only. Validated mutations run on the application server.
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant select on public.templates,public.plans to anon,authenticated;
grant select on public.profiles,public.invitations,public.invitation_versions,public.media,public.version_media,public.guest_parties,public.rsvps,public.song_requests,public.orders,public.payments,public.custom_requests,public.audit_log to authenticated;
grant all on all tables in schema public to service_role;

$pixvo_migration_0$;
    insert into public.pixvo_migrations(name) values('202610310001_platform.sql');
  end if;
end $pixvo_apply_0$;

do $pixvo_apply_1$ begin
  if not exists (select 1 from public.pixvo_migrations where name='202610310002_storage.sql') then
    execute $pixvo_migration_1$
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pixvo-private','pixvo-private',false,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','video/mp4','video/webm']) on conflict(id) do nothing;
-- Uploads pass through the server: bytes are inspected before storage.
create policy pixvo_media_owner on storage.objects for select to authenticated using(bucket_id='pixvo-private' and (storage.foldername(name))[1]=auth.uid()::text);

$pixvo_migration_1$;
    insert into public.pixvo_migrations(name) values('202610310002_storage.sql');
  end if;
end $pixvo_apply_1$;

do $pixvo_apply_2$ begin
  if not exists (select 1 from public.pixvo_migrations where name='202610310003_commercial_prices.sql') then
    execute $pixvo_migration_2$
-- Precios ARS aprobados por el titular. Importes en centavos.
-- Aplicación única mediante pixvo_migrations; no altera órdenes/snapshots previos.
update public.plans
set name = case id
      when 'standard' then 'Invitación básica'
      when 'premium' then 'Invitación interactiva'
      when 'custom' then 'Invitación premium'
    end,
    price_minor = case id
      when 'standard' then 3500000
      when 'premium' then 6000000
      when 'custom' then 10000000
    end,
    entitlements = case
      when id = 'standard' then jsonb_set(entitlements, '{audio}', 'true'::jsonb)
      else entitlements
    end
where id in ('standard', 'premium', 'custom');

$pixvo_migration_2$;
    insert into public.pixvo_migrations(name) values('202610310003_commercial_prices.sql');
  end if;
end $pixvo_apply_2$;

insert into public.templates(id,version,category,config) values('pixvo-editorial-minimal',1,'weddings','{"id":"pixvo-editorial-minimal","version":1,"name":"Votos Editoriales","category":"weddings","tier":"standard","family":"editorial","freeStyle":false,"theme":{"accent":"#6d6351","background":"#14100a","foreground":"#ffffff","headingFont":"Playfair Display","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-editorial-minimal.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero centrado, tipografía serif, separadores finos y espacios amplios."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-romantic-garden',1,'weddings','{"id":"pixvo-romantic-garden","version":1,"name":"Jardín de Seda","category":"weddings","tier":"standard","family":"ornamental","freeStyle":false,"theme":{"accent":"#f0b5b5","background":"#1a0d10","foreground":"#ffffff","headingFont":"DM Serif Display","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-romantic-garden.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-luxury-black',1,'weddings','{"id":"pixvo-luxury-black","version":1,"name":"Noche de Gala","category":"weddings","tier":"premium","family":"ornamental","freeStyle":false,"theme":{"accent":"#d4af37","background":"#050505","foreground":"#ffffff","headingFont":"Cinzel","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-luxury-black.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-boho-sunset',1,'weddings','{"id":"pixvo-boho-sunset","version":1,"name":"Atardecer Bohemio","category":"weddings","tier":"premium","family":"editorial","freeStyle":false,"theme":{"accent":"#d97757","background":"#1a0f0a","foreground":"#ffffff","headingFont":"DM Serif Display","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-boho-sunset.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero centrado, tipografía serif, separadores finos y espacios amplios."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-cinematic-couple',1,'weddings','{"id":"pixvo-cinematic-couple","version":1,"name":"Historia de Cine","category":"weddings","tier":"premium","family":"editorial","freeStyle":false,"theme":{"accent":"#ffffff","background":"#08070a","foreground":"#ffffff","headingFont":"Playfair Display","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-cinematic-couple.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero centrado, tipografía serif, separadores finos y espacios amplios."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-free-weddings',1,'weddings','{"id":"pixvo-free-weddings","version":1,"name":"Boda a tu Manera","category":"weddings","tier":"standard","family":"editorial","freeStyle":true,"theme":{"accent":"#937aff","background":"#03010e","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-free-weddings.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero centrado, tipografía serif, separadores finos y espacios amplios."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-glam-pink',1,'xv','{"id":"pixvo-glam-pink","version":1,"name":"Quince Destellos","category":"xv","tier":"standard","family":"ornamental","freeStyle":false,"theme":{"accent":"#ff4ec8","background":"#1a0815","foreground":"#ffffff","headingFont":"Cormorant Garamond","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-glam-pink.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-disco-night',1,'xv','{"id":"pixvo-disco-night","version":1,"name":"Quince Disco","category":"xv","tier":"premium","family":"party","freeStyle":false,"theme":{"accent":"#ff5fa2","background":"#100820","foreground":"#ffffff","headingFont":"Bungee","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-disco-night.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero de alto impacto, geometría diagonal, títulos grandes y contador compacto."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-princess-dream',1,'xv','{"id":"pixvo-princess-dream","version":1,"name":"Jardín de Mariposas","category":"xv","tier":"premium","family":"ornamental","freeStyle":false,"theme":{"accent":"#ff7eb5","background":"#1a0a18","foreground":"#ffffff","headingFont":"Cormorant Garamond","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-princess-dream.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-golden-luxury',1,'xv','{"id":"pixvo-golden-luxury","version":1,"name":"Quince Dorado","category":"xv","tier":"premium","family":"ornamental","freeStyle":false,"theme":{"accent":"#ffc857","background":"#080604","foreground":"#ffffff","headingFont":"Cinzel","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-golden-luxury.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-neon-party',1,'xv','{"id":"pixvo-neon-party","version":1,"name":"Quince Neón","category":"xv","tier":"premium","family":"party","freeStyle":false,"theme":{"accent":"#00ffe0","background":"#050018","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-neon-party.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero de alto impacto, geometría diagonal, títulos grandes y contador compacto."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-free-xv',1,'xv','{"id":"pixvo-free-xv","version":1,"name":"Quince a tu Manera","category":"xv","tier":"standard","family":"ornamental","freeStyle":true,"theme":{"accent":"#937aff","background":"#03010e","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-free-xv.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Marco ornamental, nombres protagonistas y tarjetas delicadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-disco-night-party',1,'parties','{"id":"pixvo-disco-night-party","version":1,"name":"Noche de Ritmo","category":"parties","tier":"standard","family":"party","freeStyle":false,"theme":{"accent":"#ff5fa2","background":"#100820","foreground":"#ffffff","headingFont":"Bungee","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-disco-night-party.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero de alto impacto, geometría diagonal, títulos grandes y contador compacto."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-boho-night-party',1,'parties','{"id":"pixvo-boho-night-party","version":1,"name":"Encuentro Bohemio","category":"parties","tier":"standard","family":"editorial","freeStyle":false,"theme":{"accent":"#d97757","background":"#1a0f0a","foreground":"#ffffff","headingFont":"DM Serif Display","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-boho-night-party.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero centrado, tipografía serif, separadores finos y espacios amplios."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-neon-party-party',1,'parties','{"id":"pixvo-neon-party-party","version":1,"name":"Pulso Nocturno","category":"parties","tier":"premium","family":"party","freeStyle":false,"theme":{"accent":"#a259ff","background":"#0a0a1f","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-neon-party-party.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero de alto impacto, geometría diagonal, títulos grandes y contador compacto."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-free-parties',1,'parties','{"id":"pixvo-free-parties","version":1,"name":"Fiesta a tu Manera","category":"parties","tier":"standard","family":"party","freeStyle":true,"theme":{"accent":"#937aff","background":"#03010e","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-free-parties.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero de alto impacto, geometría diagonal, títulos grandes y contador compacto."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-safari-adventure',1,'kids','{"id":"pixvo-safari-adventure","version":1,"name":"Aventura Selvática","category":"kids","tier":"standard","family":"kids","freeStyle":false,"theme":{"accent":"#7ccf52","background":"#0a160c","foreground":"#ffffff","headingFont":"Fredoka","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-safari-adventure.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-princess-kids',1,'kids','{"id":"pixvo-princess-kids","version":1,"name":"Reino de Colores","category":"kids","tier":"standard","family":"kids","freeStyle":false,"theme":{"accent":"#714f5c","background":"#180a18","foreground":"#ffffff","headingFont":"Cormorant Garamond","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-princess-kids.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-space-explorer',1,'kids','{"id":"pixvo-space-explorer","version":1,"name":"Héroes en Acción","category":"kids","tier":"premium","family":"kids","freeStyle":false,"theme":{"accent":"#7cc7ff","background":"#02030f","foreground":"#ffffff","headingFont":"Orbitron","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-space-explorer.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-dino-party',1,'kids','{"id":"pixvo-dino-party","version":1,"name":"Pequeños Dinosaurios","category":"kids","tier":"premium","family":"kids","freeStyle":false,"theme":{"accent":"#7ccf52","background":"#0a160c","foreground":"#ffffff","headingFont":"Fredoka","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-dino-party.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-circus-kids',1,'kids','{"id":"pixvo-circus-kids","version":1,"name":"Gran Función","category":"kids","tier":"premium","family":"kids","freeStyle":false,"theme":{"accent":"#ffd23f","background":"#1a0a14","foreground":"#ffffff","headingFont":"Fredoka","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-circus-kids.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-sports-kids',1,'kids','{"id":"pixvo-sports-kids","version":1,"name":"Equipo de Cumple","category":"kids","tier":"premium","family":"kids","freeStyle":false,"theme":{"accent":"#ffb62b","background":"#0a1f3a","foreground":"#ffffff","headingFont":"Fredoka","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-sports-kids.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-free-kids',1,'kids','{"id":"pixvo-free-kids","version":1,"name":"Cumple a tu Manera","category":"kids","tier":"standard","family":"kids","freeStyle":true,"theme":{"accent":"#937aff","background":"#03010e","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":24},"backgroundAsset":"assets/backgrounds/pixvo-free-kids.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Título lúdico, formas grandes y tarjetas redondeadas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-tech-conference',1,'corporate','{"id":"pixvo-tech-conference","version":1,"name":"Foro Esencial","category":"corporate","tier":"standard","family":"corporate","freeStyle":false,"theme":{"accent":"#00d8d8","background":"#0a0a0a","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-tech-conference.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero alineado izquierda, agenda estructurada y sedes en tarjetas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-luxury-brand',1,'corporate','{"id":"pixvo-luxury-brand","version":1,"name":"Conexión Digital","category":"corporate","tier":"premium","family":"corporate","freeStyle":false,"theme":{"accent":"#00d8d8","background":"#06121a","foreground":"#ffffff","headingFont":"Cinzel","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-luxury-brand.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero alineado izquierda, agenda estructurada y sedes en tarjetas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-executive-slate',1,'corporate','{"id":"pixvo-executive-slate","version":1,"name":"Encuentro Ejecutivo","category":"corporate","tier":"premium","family":"corporate","freeStyle":false,"theme":{"accent":"#6ec8d8","background":"#0a1018","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-executive-slate.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero alineado izquierda, agenda estructurada y sedes en tarjetas."}'::jsonb) on conflict(id) do nothing;

insert into public.templates(id,version,category,config) values('pixvo-free-corporate',1,'corporate','{"id":"pixvo-free-corporate","version":1,"name":"Evento a tu Manera","category":"corporate","tier":"standard","family":"corporate","freeStyle":true,"theme":{"accent":"#937aff","background":"#03010e","foreground":"#ffffff","headingFont":"Sora","bodyFont":"Inter Tight","radius":8},"backgroundAsset":"assets/backgrounds/pixvo-free-corporate.svg","blocks":["hero","countdown","venues","message","rsvp"],"optionalBlocks":["calendar","gallery","dressCode","gifts","music","social","songRequests","agenda"],"layoutNotes":"Hero alineado izquierda, agenda estructurada y sedes en tarjetas."}'::jsonb) on conflict(id) do nothing;

insert into public.plans(id,name,price_minor,currency,entitlements) values('standard','Invitación básica',3500000,'ARS','{"tier":"standard","photos":4,"video":false,"audio":true,"qr":false,"republications":3,"validDays":365}'::jsonb) on conflict(id) do nothing;

insert into public.plans(id,name,price_minor,currency,entitlements) values('premium','Invitación interactiva',6000000,'ARS','{"tier":"premium","photos":30,"video":true,"audio":true,"qr":true,"republications":3,"validDays":365}'::jsonb) on conflict(id) do nothing;

insert into public.plans(id,name,price_minor,currency,entitlements) values('custom','Invitación premium',10000000,'ARS','{"tier":"custom","photos":60,"video":true,"audio":true,"qr":true,"republications":1000,"validDays":365}'::jsonb) on conflict(id) do nothing;

alter table public.pixvo_migrations enable row level security;

revoke all on public.pixvo_migrations from anon,authenticated;

notify pgrst, 'reload schema';

commit;

select (select count(*) from public.templates) as templates, (select count(*) from public.plans) as plans, (select count(*) from public.pixvo_migrations) as migrations;
