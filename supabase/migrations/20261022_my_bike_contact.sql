begin;
alter table public.bp_bikes add column local_bike_id text check(length(local_bike_id) between 1 and 80);
create unique index bp_bikes_local_identity on public.bp_bikes(user_id,local_bike_id) where local_bike_id is not null;
commit;
