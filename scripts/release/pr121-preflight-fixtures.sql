-- PR121 offline release preflight fixture helpers.
--
-- This file is executable SQL loaded by scripts/release/pr121-preflight-rehearsal.mjs
-- for every fixture transaction. Scenario data lives in the runner, while these
-- checked-in helpers own the actual fixture insertion surface and exact registry.

create temp table if not exists pr121_fixture_registry (
  fixture_kind text not null,
  fixture_id uuid not null,
  scenario text not null,
  primary key (fixture_kind, fixture_id)
) on commit drop;

create or replace function pg_temp.pr121_register_fixture(
  p_kind text,
  p_id uuid,
  p_scenario text
)
returns uuid
language plpgsql
as $$
begin
  insert into pr121_fixture_registry(fixture_kind, fixture_id, scenario)
  values (p_kind, p_id, p_scenario)
  on conflict do nothing;

  return p_id;
end;
$$;

create or replace function pg_temp.pr121_insert_contact(
  p_scenario text,
  p_id uuid,
  p_email text,
  p_phone text,
  p_phone_normalized text
)
returns uuid
language plpgsql
as $$
begin
  perform pg_temp.pr121_register_fixture('contact', p_id, p_scenario);

  insert into public.contacts(id, first_name, last_name, email, phone, phone_normalized)
  values (p_id, 'PR121', 'Fixture', p_email, p_phone, p_phone_normalized);

  return p_id;
end;
$$;

create or replace function pg_temp.pr121_insert_session(
  p_scenario text,
  p_id uuid,
  p_status text default 'completed',
  p_step_reached smallint default 5
)
returns uuid
language plpgsql
as $$
begin
  perform pg_temp.pr121_register_fixture('session', p_id, p_scenario);

  insert into public.sessions(id, utm_source, landing_page, status, step_reached)
  values (p_id, p_scenario, '/pr121-preflight', p_status, p_step_reached);

  return p_id;
end;
$$;

create or replace function pg_temp.pr121_insert_lead(
  p_scenario text,
  p_id uuid,
  p_session_id uuid,
  p_contact_id uuid,
  p_email text,
  p_phone text,
  p_phone_normalized text,
  p_normalized_email text,
  p_normalized_phone text,
  p_address text
)
returns uuid
language plpgsql
as $$
begin
  perform pg_temp.pr121_register_fixture('lead', p_id, p_scenario);

  insert into public.leads(
    id,
    session_id,
    contact_id,
    email,
    phone,
    phone_normalized,
    normalized_email,
    normalized_phone,
    normalized_property_address,
    state,
    primary_intent,
    status,
    lead_type,
    source,
    source_detail,
    page_url,
    widget_session_id,
    address_raw,
    question_raw
  ) values (
    p_id,
    p_session_id,
    p_contact_id,
    p_email,
    p_phone,
    p_phone_normalized,
    p_normalized_email,
    p_normalized_phone,
    lower(p_address),
    'NC',
    'sell',
    'new',
    'home_value',
    'pr121-preflight',
    p_scenario,
    '/pr121-preflight',
    p_session_id::text,
    p_address,
    ''
  );

  return p_id;
end;
$$;
