-- profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  company_name text,
  niche text,
  plan text default 'trial' check (plan in ('free', 'trial', 'pro')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  monthly_email_limit int default 20,
  timezone text default 'Europe/London'
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- integrations_google
create table if not exists public.integrations_google (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text,
  refresh_token text not null,
  expiry timestamptz,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.integrations_google enable row level security;

drop policy if exists "integrations_google_all" on public.integrations_google;
create policy "integrations_google_all" on public.integrations_google
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  source text default 'apify',
  company_name text,
  contact_name text,
  email text not null,
  website text,
  linkedin text,
  location text,
  industry text,
  notes text,
  status text default 'new' check (status in ('new', 'queued', 'emailed', 'replied', 'bounced', 'unsubscribed'))
);

create index if not exists leads_user_created on public.leads(user_id, created_at desc);
create index if not exists leads_user_status on public.leads(user_id, status);

alter table public.leads enable row level security;

drop policy if exists "leads_all" on public.leads;
create policy "leads_all" on public.leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  value_prop text,
  offer text,
  sending_account text,
  daily_send_limit int default 10,
  status text default 'draft' check (status in ('draft', 'running', 'paused', 'completed'))
);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_all" on public.campaigns;
create policy "campaigns_all" on public.campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- campaign_leads
create table if not exists public.campaign_leads (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_step int default 1,
  next_send_at timestamptz not null,
  last_sent_at timestamptz,
  state text default 'pending' check (state in ('pending', 'sent', 'replied', 'stopped')),
  primary key (campaign_id, lead_id)
);

alter table public.campaign_leads enable row level security;

drop policy if exists "campaign_leads_select" on public.campaign_leads;
create policy "campaign_leads_select" on public.campaign_leads for select
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
drop policy if exists "campaign_leads_insert" on public.campaign_leads;
create policy "campaign_leads_insert" on public.campaign_leads for insert
  with check (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
drop policy if exists "campaign_leads_update" on public.campaign_leads;
create policy "campaign_leads_update" on public.campaign_leads for update
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

-- messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz default now(),
  direction text not null check (direction in ('outbound', 'inbound')),
  subject text not null,
  body_text text not null,
  body_html text,
  provider text default 'gmail',
  provider_message_id text,
  thread_id text,
  status text default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed')),
  error text,
  meta jsonb
);

alter table public.messages enable row level security;

drop policy if exists "messages_all" on public.messages;
create policy "messages_all" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- events_email
create table if not exists public.events_email (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz default now(),
  type text check (type in ('open', 'click', 'bounce', 'reply_detected'))
);

alter table public.events_email enable row level security;

drop policy if exists "events_email_all" on public.events_email;
create policy "events_email_all" on public.events_email for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- billing_customers
create table if not exists public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null
);

alter table public.billing_customers enable row level security;

drop policy if exists "billing_customers_all" on public.billing_customers;
create policy "billing_customers_all" on public.billing_customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- billing_subscriptions
create table if not exists public.billing_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null,
  status text,
  current_period_end timestamptz
);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_all" on public.billing_subscriptions;
create policy "billing_subscriptions_all" on public.billing_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, trial_ends_at, monthly_email_limit)
  values (new.id, 'trial', now() + interval '14 days', 20)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
