-- INFRA-03 read-only contact identity preflight.
--
-- Run before applying the unpublished INFRA-02 lifecycle migration to any
-- non-local database. This query reports historical contacts that would make
-- canonical email/phone backfill ambiguous. It does not modify data.

with normalized_contacts as (
  select
    id,
    created_at,
    nullif(lower(btrim(email)), '') as normalized_email,
    coalesce(
      case
        when nullif(regexp_replace(coalesce(phone_normalized, ''), '[^0-9]', '', 'g'), '') is null then null
        when length(regexp_replace(phone_normalized, '[^0-9]', '', 'g')) = 11
          and left(regexp_replace(phone_normalized, '[^0-9]', '', 'g'), 1) = '1'
          then substring(regexp_replace(phone_normalized, '[^0-9]', '', 'g') from 2)
        else regexp_replace(phone_normalized, '[^0-9]', '', 'g')
      end,
      case
        when nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') is null then null
        when length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
          and left(regexp_replace(phone, '[^0-9]', '', 'g'), 1) = '1'
          then substring(regexp_replace(phone, '[^0-9]', '', 'g') from 2)
        else regexp_replace(phone, '[^0-9]', '', 'g')
      end
    ) as normalized_phone
  from public.contacts
),
email_conflicts as (
  select
    'email' as identity_type,
    normalized_email as normalized_value,
    count(distinct id) as contact_count,
    array_agg(id order by created_at, id) as contact_ids
  from normalized_contacts
  where normalized_email is not null
  group by normalized_email
  having count(distinct id) > 1
),
phone_conflicts as (
  select
    'phone' as identity_type,
    normalized_phone as normalized_value,
    count(distinct id) as contact_count,
    array_agg(id order by created_at, id) as contact_ids
  from normalized_contacts
  where normalized_phone is not null
  group by normalized_phone
  having count(distinct id) > 1
),
legacy_leads as (
  select
    id,
    coalesce(
      nullif(lower(btrim(normalized_email)), ''),
      nullif(lower(btrim(email)), '')
    ) as normalized_email,
    coalesce(
      case
        when nullif(regexp_replace(coalesce(normalized_phone, ''), '[^0-9]', '', 'g'), '') is null then null
        when length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) = 11
          and left(regexp_replace(normalized_phone, '[^0-9]', '', 'g'), 1) = '1'
          then substring(regexp_replace(normalized_phone, '[^0-9]', '', 'g') from 2)
        else regexp_replace(normalized_phone, '[^0-9]', '', 'g')
      end,
      case
        when nullif(regexp_replace(coalesce(phone_normalized, ''), '[^0-9]', '', 'g'), '') is null then null
        when length(regexp_replace(phone_normalized, '[^0-9]', '', 'g')) = 11
          and left(regexp_replace(phone_normalized, '[^0-9]', '', 'g'), 1) = '1'
          then substring(regexp_replace(phone_normalized, '[^0-9]', '', 'g') from 2)
        else regexp_replace(phone_normalized, '[^0-9]', '', 'g')
      end,
      case
        when nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') is null then null
        when length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
          and left(regexp_replace(phone, '[^0-9]', '', 'g'), 1) = '1'
          then substring(regexp_replace(phone, '[^0-9]', '', 'g') from 2)
        else regexp_replace(phone, '[^0-9]', '', 'g')
      end
    ) as normalized_phone
  from public.leads
),
email_contact_matches as (
  select
    legacy_leads.id as lead_id,
    array_agg(distinct normalized_contacts.id order by normalized_contacts.id) as contact_ids
  from legacy_leads
  join normalized_contacts
    on normalized_contacts.normalized_email = legacy_leads.normalized_email
  where legacy_leads.normalized_email is not null
  group by legacy_leads.id
),
phone_contact_matches as (
  select
    legacy_leads.id as lead_id,
    array_agg(distinct normalized_contacts.id order by normalized_contacts.id) as contact_ids
  from legacy_leads
  join normalized_contacts
    on normalized_contacts.normalized_phone = legacy_leads.normalized_phone
  where legacy_leads.normalized_phone is not null
  group by legacy_leads.id
),
lead_split_identity_conflicts as (
  select
    'lead_split_identity' as identity_type,
    -- For split-identity rows, normalized_value is a lead record identifier, not
    -- an email or phone identity value.
    email_matches.lead_id::text as normalized_value,
    cardinality(distinct_contacts.contact_ids) as contact_count,
    distinct_contacts.contact_ids
  from email_contact_matches email_matches
  join phone_contact_matches phone_matches
    on phone_matches.lead_id = email_matches.lead_id
  cross join lateral (
    select array_agg(distinct contact_id order by contact_id) as contact_ids
    from unnest(email_matches.contact_ids || phone_matches.contact_ids) contact_ids(contact_id)
  ) distinct_contacts
  where not exists (
    select 1
    from unnest(email_matches.contact_ids) email_contacts(contact_id)
    join unnest(phone_matches.contact_ids) phone_contacts(contact_id)
      using (contact_id)
  )
)
select *
from email_conflicts
union all
select *
from phone_conflicts
union all
select *
from lead_split_identity_conflicts
order by identity_type, normalized_value;
