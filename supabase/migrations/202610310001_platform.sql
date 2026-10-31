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
