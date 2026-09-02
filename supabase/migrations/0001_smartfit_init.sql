-- ============================================================
-- SmartFit AI (SMFT) — Phase 1 schema + Row Level Security
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

-- 1) PROFILES -------------------------------------------------
create table if not exists public.profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  email                 text,
  age                   int check (age between 16 and 80),
  activity_level        text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goals                 text[] not null default '{}',
  conditions            text[] not null default '{}',
  injuries              text not null default '',
  chest_pain            boolean not null default false,
  fainting              boolean not null default false,
  pregnant              boolean not null default false,
  recent_surgery_months int check (recent_surgery_months between 1 and 120),
  health_flags          text[] not null default '{}',
  risk_status           text not null default 'pending_review'
                        check (risk_status in ('pending_review','approved','needs_info','rejected')),
  review_note           text,
  is_founder            boolean not null default false,
  onboarding_done       boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 2) WEEKLY PLANS ----------------------------------------------
create table if not exists public.weekly_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_number      int  not null default 1 check (week_number >= 1),
  status           text not null default 'generating'
                   check (status in ('generating','completed','failed','superseded')),
  error_code       text,
  plan_json        jsonb,
  context_snapshot jsonb,
  model            text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index if not exists weekly_plans_user_week
  on public.weekly_plans (user_id, week_number desc);

-- 3) FEEDBACK --------------------------------------------------
create table if not exists public.plan_feedback (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.weekly_plans(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  rating         int check (rating between 1 and 5),
  notes          text check (char_length(notes) <= 2000),
  days_completed boolean[],
  submitted_at   timestamptz not null default now(),
  unique (plan_id, user_id)
);

-- ============================================================
-- Row Level Security
-- Subscribers may only read/write rows where user_id matches
-- their own auth.uid(). Founder gets read-all via is_founder().
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.weekly_plans  enable row level security;
alter table public.plan_feedback enable row level security;
alter table public.profiles      force row level security;
alter table public.weekly_plans  force row level security;
alter table public.plan_feedback force row level security;

-- Helper: can the current user read the founder review queue?
create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_founder from public.profiles p where p.user_id = auth.uid()), false);
$$;

-- PROFILES ----
-- Subscriber: SELECT their own row only. No INSERT/UPDATE/DELETE via client —
-- the profile is written exclusively by the server (service role), so a
-- subscriber can never self-approve or flag themselves as founder.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

-- Founder: may SELECT the whole queue (read-only).
create policy "profiles_select_founder" on public.profiles
  for select to authenticated
  using (public.is_founder());

-- WEEKLY PLANS ----
-- Subscriber: SELECT own rows only. Generation writes happen server-side.
create policy "weekly_plans_select_own" on public.weekly_plans
  for select to authenticated
  using (auth.uid() = user_id);

-- FEEDBACK ----
-- Subscriber: read/write their own feedback, but only attached to their own plan.
create policy "plan_feedback_all_own" on public.plan_feedback
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.weekly_plans wp
      where wp.id = plan_id and wp.user_id = auth.uid()
    )
  );

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();