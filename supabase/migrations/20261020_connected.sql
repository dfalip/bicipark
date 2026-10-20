begin;
create table public.bp_user_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 1 check(revision>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=5242880),
 updated_at timestamptz not null default now()
);
alter table public.bp_user_state enable row level security;
revoke all on public.bp_user_state from anon, authenticated;
grant select, insert, update, delete on public.bp_user_state to authenticated;
create policy owner_state on public.bp_user_state to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.bp_save_state(expected_revision integer, new_payload jsonb) returns integer language plpgsql security invoker set search_path=public as $$
declare v integer; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if expected_revision=0 then
  begin insert into bp_user_state(user_id,payload) values(auth.uid(),new_payload) returning revision into v;
  exception when unique_violation then raise exception 'SYNC_CONFLICT'; end;
 else
  update bp_user_state set payload=new_payload,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=expected_revision returning revision into v;
  if v is null then raise exception 'SYNC_CONFLICT'; end if;
 end if; return v;
end $$;
revoke all on function public.bp_save_state(integer,jsonb) from public;
grant execute on function public.bp_save_state(integer,jsonb) to authenticated;

create table public.bp_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('pothole','works','closed','danger','water','repair','parking')),
 description text not null check(length(description) between 5 and 500),
 lat double precision not null check(lat between -90 and 90), lng double precision not null check(lng between -180 and 180),
 status text not null default 'pending' check(status in ('pending','approved','rejected','resolved')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '14 days'
);
alter table public.bp_reports enable row level security;
revoke all on public.bp_reports from anon, authenticated;
grant select on public.bp_reports to anon,authenticated;
grant delete on public.bp_reports to authenticated;
create policy report_read on public.bp_reports for select using((status='approved' and expires_at>now()) or user_id=(select auth.uid()));
create policy report_delete on public.bp_reports for delete to authenticated using(user_id=(select auth.uid()));
create function public.bp_submit_report(report_kind text, report_description text, latitude double precision, longitude double precision) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from bp_reports where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily report limit'; end if;
 insert into bp_reports(user_id,kind,description,lat,lng) values(auth.uid(),report_kind,report_description,latitude,longitude) returning id into result;return result;
end $$;
revoke all on function public.bp_submit_report(text,text,double precision,double precision) from public;
grant execute on function public.bp_submit_report(text,text,double precision,double precision) to authenticated;
create table public.bp_report_votes (
 report_id uuid references public.bp_reports(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,
 value smallint not null check(value in (-1,1)),primary key(report_id,user_id)
);
alter table public.bp_report_votes enable row level security;
revoke all on public.bp_report_votes from anon, authenticated;
grant select, insert, update, delete on public.bp_report_votes to authenticated;
create policy vote_owner on public.bp_report_votes to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from bp_reports r where r.id=report_id and r.status='approved' and r.expires_at>now()));

create table public.bp_bikes (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 public_token uuid not null unique default gen_random_uuid(),brand text not null check(length(brand) between 1 and 80),
 model text not null check(length(model) between 1 and 100),serial text not null check(length(serial) between 1 and 150),
 status text not null default 'registered' check(status in ('registered','stolen','recovered')),
 published boolean not null default false,created_at timestamptz not null default now()
);
alter table public.bp_bikes enable row level security;
revoke all on public.bp_bikes from anon,authenticated;
grant select,insert,update,delete on public.bp_bikes to authenticated;
create policy bike_owner on public.bp_bikes to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.bp_public_bike(token uuid) returns table(brand text,model text,status text) language sql stable security definer set search_path=public as $$ select b.brand,b.model,b.status from bp_bikes b where b.public_token=token and b.published=true $$;
revoke all on function public.bp_public_bike(uuid) from public;
grant execute on function public.bp_public_bike(uuid) to anon,authenticated;
create table public.bp_bike_messages (
 id uuid primary key default gen_random_uuid(),bike_id uuid not null references public.bp_bikes(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,contact text not null check(length(contact) between 3 and 180),
 message text not null check(length(message) between 5 and 1000),created_at timestamptz not null default now()
);
alter table public.bp_bike_messages enable row level security;
revoke all on public.bp_bike_messages from anon,authenticated;
grant select,delete on public.bp_bike_messages to authenticated;
create policy message_read on public.bp_bike_messages for select to authenticated using(sender_id=(select auth.uid()) or exists(select 1 from bp_bikes b where b.id=bike_id and b.user_id=(select auth.uid())));
create policy message_delete on public.bp_bike_messages for delete to authenticated using(exists(select 1 from bp_bikes b where b.id=bike_id and b.user_id=(select auth.uid())));
create function public.bp_found_bike(token uuid, sender_contact text, body text) returns void language plpgsql security definer set search_path=public as $$
declare bike uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from bp_bike_messages where sender_id=auth.uid() and created_at>now()-interval '1 day')>=3 then raise exception 'Daily message limit'; end if;
 select id into bike from bp_bikes where public_token=token and published=true;if bike is null then raise exception 'Bike unavailable';end if;
 insert into bp_bike_messages(bike_id,sender_id,contact,message) values(bike,auth.uid(),sender_contact,body);
end $$;
revoke all on function public.bp_found_bike(uuid,text,text) from public;
grant execute on function public.bp_found_bike(uuid,text,text) to authenticated;

create table public.bp_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(name in ('parking_search','near_me','parking_saved','route_calculated','gpx_imported','gpx_exported','route_saved','watch_checked','activity_saved','match_completed','plan_activated')),
 created_at timestamptz not null default now()
);
alter table public.bp_events enable row level security;
revoke all on public.bp_events from anon,authenticated;
grant select,delete on public.bp_events to authenticated;
grant insert(user_id,name) on public.bp_events to authenticated;
create policy events_owner on public.bp_events to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index on public.bp_events(created_at);
create index on public.bp_reports(status,expires_at);
commit;
