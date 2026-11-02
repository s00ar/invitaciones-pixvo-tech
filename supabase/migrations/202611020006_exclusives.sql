-- Unlimited is an event setting, never an attendee-controlled bypass.
alter table public.guest_parties drop constraint guest_parties_max_attendees_check;
alter table public.guest_parties alter column max_attendees drop not null;
alter table public.guest_parties add constraint guest_parties_max_attendees_check check(max_attendees > 0);
alter table public.rsvps drop constraint rsvps_attendees_check;
alter table public.rsvps add constraint rsvps_attendees_check check(attendees >= 0);

create table public.exclusive_events (
 event_id uuid primary key references public.invitations(id),
 design text not null check(design in ('azul')),
 notification_email text not null,
 notification_whatsapp text not null,
 created_at timestamptz not null default now()
);
create table public.notification_outbox (
 id uuid primary key,
 event_id uuid not null references public.invitations(id),
 rsvp_id uuid not null references public.rsvps(id),
 rsvp_version int not null,
 channel text not null check(channel in ('email')),
 payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','processing','accepted','failed','uncertain')),
 provider_id text,
 attempts int not null default 0,
 updated_at timestamptz not null default now(),
 unique(rsvp_id,rsvp_version,channel)
);
alter table public.exclusive_events enable row level security;
alter table public.notification_outbox enable row level security;
grant all on public.exclusive_events,public.notification_outbox to service_role;
grant select on public.notification_outbox to authenticated;
create policy notification_owner_read on public.notification_outbox for select to authenticated using(exists(select 1 from public.invitations i where i.id=event_id and i.owner_id=auth.uid()));
