-- Supabase SQL Editor: run once in a NEW project.
create table public.bl_menu (
 id bigint generated always as identity primary key,
 name text not null check (char_length(name) between 1 and 100),
 category text not null, description text not null default '',
 price numeric(10,2) check(price >= 0), photo text not null default '',
 active boolean not null default true
);
create table public.bl_calls (
 id uuid primary key default gen_random_uuid(), table_no integer not null check(table_no between 1 and 20),
 kind text not null check(kind in ('garson','gorevli')),
 status text not null default 'waiting' check(status in ('waiting','attending','done')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index bl_one_active_call on public.bl_calls(table_no,kind) where status <> 'done';
create table public.bl_orders (
 id uuid primary key default gen_random_uuid(), table_no integer not null check(table_no between 1 and 20),
 items jsonb not null, note text not null default '',
 status text not null default 'pending' check(status in ('pending','ready','delivered')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index bl_orders_status on public.bl_orders(status,created_at);
alter table public.bl_menu enable row level security;
alter table public.bl_calls enable row level security;
alter table public.bl_orders enable row level security;
revoke all on public.bl_menu,public.bl_calls,public.bl_orders from anon,authenticated;
grant all on public.bl_menu,public.bl_calls,public.bl_orders to service_role;
grant usage,select on sequence public.bl_menu_id_seq to service_role;
-- Example menu, not verified offerings or prices. Edit in /admin.
insert into public.bl_menu(name,category,description) values
 ('Çıtır tavuk burger','Ana yemek','Çıtır tavuklu burger'),
 ('Mantı','Ana yemek','Yoğurtlu ve soslu mantı'),
 ('Köfte','Ana yemek',''),('Pilav','Yan lezzetler',''),
 ('Patates kızartması','Yan lezzetler',''),('Çorba','Başlangıç',''),
 ('Çay','İçecek','');
