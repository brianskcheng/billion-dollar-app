-- integrations_microsoft (mirrors integrations_google for Outlook)
create table if not exists public.integrations_microsoft (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text,
  refresh_token text not null,
  expiry timestamptz,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.integrations_microsoft enable row level security;

drop policy if exists "integrations_microsoft_all" on public.integrations_microsoft;
create policy "integrations_microsoft_all" on public.integrations_microsoft
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
