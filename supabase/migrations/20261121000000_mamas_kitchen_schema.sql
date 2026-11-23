-- Mama's Kitchen Supabase Schema & RLS Migration
-- Designed for Clerk authentication (JWT sub claim = Clerk user ID stored as TEXT)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (links Clerk user ID to role and app metadata)
create table if not exists public.profiles (
  id text primary key, -- Clerk user ID (e.g. user_...)
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'owner')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Staff Invitations Table
create table if not exists public.staff_invitations (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  role text not null default 'staff' check (role in ('staff', 'owner')),
  permissions jsonb not null default '[]'::jsonb,
  invited_by text references public.profiles(id),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now()) + interval '7 days' not null
);

-- 3. Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  image text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Menu Items Table
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  category text not null references public.categories(name) on update cascade,
  short_description text not null,
  full_description text not null,
  ingredients_highlight jsonb not null default '[]'::jsonb,
  prep_style text not null,
  price_naira integer not null check (price_naira >= 0),
  image text not null,
  is_available boolean default true not null,
  is_featured boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Orders Table
create table if not exists public.orders (
  reference text primary key,
  owner_id text not null references public.profiles(id),
  email text not null,
  total_naira integer not null check (total_naira >= 0),
  expected_amount_kobo integer not null check (expected_amount_kobo >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  channel text,
  paid_at timestamp with time zone,
  delivery_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Order Items Table
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_reference text not null references public.orders(reference) on delete cascade,
  meal_id text not null references public.menu_items(id),
  name text not null,
  unit_price_naira integer not null check (unit_price_naira >= 0),
  quantity integer not null check (quantity > 0),
  line_total_naira integer not null check (line_total_naira >= 0)
);

-- 7. Payments Table
create table if not exists public.payments (
  reference text primary key references public.orders(reference),
  provider text not null default 'paystack',
  amount_kobo integer not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  status text not null,
  raw_response jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Restaurant Settings Table
create table if not exists public.restaurant_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text not null,
  type text not null default 'order',
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_user_id text references public.profiles(id),
  actor_role text not null,
  action text not null,
  target text not null,
  outcome text not null check (outcome in ('allowed', 'denied')),
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Grant schema and table access to roles
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update on public.orders, public.order_items, public.profiles to authenticated;

-- RLS Policies using Clerk JWT sub claim (auth.jwt() ->> 'sub')
create policy "Users can read own profile" on public.profiles
  for select using ((auth.jwt() ->> 'sub') = id);

create policy "Users can update own profile" on public.profiles
  for update using ((auth.jwt() ->> 'sub') = id);

create policy "Staff and owners can read profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
    )
  );

create policy "Anyone can read categories" on public.categories
  for select using (true);

create policy "Anyone can read available menu items" on public.menu_items
  for select using (is_available = true or exists (
    select 1 from public.profiles
    where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
  ));

create policy "Users can read own orders" on public.orders
  for select using ((auth.jwt() ->> 'sub') = owner_id);

create policy "Users can insert own orders" on public.orders
  for insert with check ((auth.jwt() ->> 'sub') = owner_id);

create policy "Staff and owners can read all orders" on public.orders
  for select using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
    )
  );

create policy "Staff and owners can update orders" on public.orders
  for update using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
    )
  );

create policy "Users can read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.reference = order_items.order_reference and orders.owner_id = (auth.jwt() ->> 'sub')
    )
  );

create policy "Staff and owners can read all order items" on public.order_items
  for select using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
    )
  );

create policy "Staff and owners can read restaurant settings" on public.restaurant_settings
  for select using (true);

create policy "Staff and owners can read notifications" on public.notifications
  for select using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role in ('staff', 'owner')
    )
  );

create policy "Owners can manage staff invitations" on public.staff_invitations
  for all using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and role = 'owner'
    )
  );
